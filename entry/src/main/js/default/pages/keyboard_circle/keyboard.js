/*
 * 项目名称：CrabKeyboard
 * 项目作者：crabKun
 * 文件用途：LiteWearable 中文输入键盘及候选词处理
 * 当前版本：1.0.0
 * 开源协议：MIT License
 * 创建日期：2026.8.29
 */

import Vibrator from '@system.vibrator';
import File from '@system.file';
import Router from '@system.router';
import Device from '@system.device';
import lookupDict from '../../common/keyboard/lookupDictV5';
const key_en=[
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["z","x","c","v","b","n","m",","]
];
const key_symbol=[
    ["`","~","@","#","%","&","*","-","^","+","=","$","×"],
    ["(",")","[","]","<",">","\\","|","/","_","±","≈"],
    [";",":","\"","‘","“","?","!",",",".","∞","π"]
];
const key_cnShift=[
    ["1","2","3","4","5","6","7","8","9","0"],
    ["《","》","~","…","—","（","）","‘","’"],
    ["“","”","；","：","！","？","、","。"]
];
const key_enShift=[
    ["1","2","3","4","5","6","7","8","9","0"],
    ["@","#","$","&","(",")","/","_","-"],
    ["'","\"",";",":","!","?","\\","."]
];
const key_syShift=[
    ["1","2","3","4","5","6","7","8","9","0","≠","￥","÷"],
    ["{","}","【","】","《","》","、","·","…","—","≤","≥"],
    ["；","：","'","’","”","？","！","，","。","∑","√"]
];
let timer_cursor;
let timer_operate;
let timer_ani;
let timer_alert;
let timer_focus;
let moveKey=true;//移动对象为键盘还是文本框
let oriX=0;
let oriY=0;
let disArr=[];
let timeArr=[];

let updateCount=0; //候选刷新令牌：每次updateCandidates递增，回调中比对thisCount作废过期请求
let prefMap={};
let prefsDirty=false;

const numOfLists=330/30;
let textWidth=0;
let nextTextWidth=0;
let nextLineWArr=[];//后续行每段的宽度，滑动下限，为优化性能新行在末尾
let lineHeight=-38;//初始为一行，scrollTo会重算
let totalLen=0;//总字节数

const easeOutBack = t => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export default {
    data: {
        // 跳转键盘时传入的配置参数
        targetPage:'',    // 必填：输入完成后跳转的目标页面
        backPage:'',      // 可选：输入为空时返回的页面；为空则返回 targetPage
        targetKey:'',     // 必填：目标页面接收输入内容的变量名
        prompt:'请输入文字', // 可选：输入框为空时显示的提示文字
        maxLen:0,         // 可选：最大输入长度；0 表示不限制
        forbidden:'',     // 可选：禁止输入的字符，不建议用于长文本输入
        allowNewline:true,// 可选：是否允许输入换行符
        keyType:0,        // 可选：默认键盘类型：0 中文，1 小写，2 大写，3 符号

        //页面数据，勿动
        font:'HarmonyOSHans-Medium',
        keyPos:0,//键盘位置
        aniType:0,
        aniPos:0,
        aniDotPos:0,
        aniOpacity:0,

        prevLines:'',
        text:'',
        nextText:'\n',
        nextLines:'',
        lineWArr:[],//记录压入prevLines的每行宽度
        linePos:0,//当前行所在位置
        constN:'\n',
        showCursor:false,

        pinyin:'',
        pyList:[],
        pyFullList:[],
        shearList:[],
        alertIf:false,
        alertShow:false,
        showPy:true,//true拼音,false剪切板
        focusValue:50,//表冠当前值

        msg:{
            content:'',
            timer:null
        }
    },
    onInit() {
        Device.getInfo({
            success:(data)=>{
                if (data.apiVersion>=12){
                    this.font='HarmonyOS_Sans_SCGB2312-Bold'
                }else if (data.apiVersion>=10&&data.screenShape=='rect'){
                    this.font='HarmonyOSSans-Bold'
                };
            }
        });
        timer_cursor=setInterval(()=>this.showCursor=!this.showCursor,500);
        File.readText({
            uri:'internal://app/shear.json',
            success:(data)=>{
                if (data.text) {
                    this.shearList=JSON.parse(data.text)
                }
            }
        });
        this.loadPrefs();
    },
    onShow(){
        if (this.$refs.text.rotation) {
            this.$refs.text.rotation()
        };
    },
    onHide(){
        if (this.$refs.text.rotation) {
            this.$refs.text.rotation({focus:false})
        };
    },
    onDestroy(){
        clearInterval(timer_cursor);
        clearInterval(timer_operate);
        clearInterval(timer_ani);
        clearTimeout(timer_alert);
        clearTimeout(timer_focus);
        if(prefsDirty)this.savePrefs();
        if (this.shearList.length) {
            File.writeText({
                uri:'internal://app/shear.json',
                text:JSON.stringify(this.shearList)
            })
        }
    },
    cancel(e={type:'click'}){
        if (e.direction=='right'||e.type=='click'){
            if (this.msg.timer) {
                let obj=new Object();
                obj[this.targetKey]='';
                Router.replace({
                    uri:this.backPage?this.backPage:this.targetPage,
                    params:obj
                });
                return;
            };
            this.sendMsg(`再${e.direction=='right'?'划':'点'}一次放弃编辑`);
        }
    },
    done(){
        if (!this.prevLines&&!this.text&&this.nextText==this.constN&&!this.nextLines) {
            this.sendMsg('请先输入文本');
            return;
        };
        let text='';
        if (this.forbidden) {
            text=(this.prevLines.split('\r').join('') + this.text + this.nextText + this.nextLines).slice(0,-1);
            for (let i = 0; i < this.forbidden.length; i++) {
                if (text.indexOf(this.forbidden[i])!==-1) {
                    this.sendMsg('含有非法字符!')
                    return
                }
            }
        };
        let obj=new Object();
        obj[this.targetKey]=text||(this.prevLines.split('\r').join('') + this.text + this.nextText + this.nextLines).slice(0,-1);
        Router.replace({
            uri:this.targetPage,
            params:obj
        });
    },
    click(e){
        const line=Math.floor((e.globalY-230)/60);
        if (line<0||line>2||e.globalX-this.keyPos-29*line<0)return;
        const row=Math.floor((e.globalX-this.keyPos-29*line)/57);
        if (row<0||row>(this.keyType==3?12:9)-line)return;
        switch (this.keyType){
            case 3:
                this.input(key_symbol[line][row]);
                break
            case 2:
                this.input(key_en[line][row].toUpperCase());
                break
            case 1:
                this.input(key_en[line][row])
                break
            case 0:
                if (line==2&&row==7) {
                    if (this.pinyin) {
                        this.clearCandidates()
                    };
                    this.input('，');
                    return
                };
                this.pinyin+=key_en[line][row];
                this.updateCandidates()
                break

        }
    },
    press(e){
        const line=Math.floor((e.globalY-230)/60);
        if (line<0||line>2||e.globalX-this.keyPos-29*line<0)return;
        const row=Math.floor((e.globalX-this.keyPos-29*line)/57);
        if (row<0||row>(this.keyType==3?12:9)-line)return;
        switch (this.keyType){
            case 3:
                this.input(key_syShift[line][row]);
                break
            case 0:
                if (this.pinyin) {
                    this.clearCandidates()

                };
                this.input(key_cnShift[line][row]);
                break
            default:
                this.input(key_enShift[line][row]);
        };
        Vibrator.vibrate({mode:'short'});
    },
    //选中候选词：写入文本、消费拼音、刷新MTF偏好与候选
    clickCn(id){
        const obj=this.pyFullList.length?this.pyFullList[Math.floor(id/4)][id%4]:this.pyList[id];
        if (!obj)return;
        this.closeAlert();
        //偏好：键内去重unshift，上限3
        const fullPinyin=this.pinyin;
        const existing=prefMap[fullPinyin]||[];
        for(let i=0;i<existing.length;i++){
            if(existing[i].word===obj.word){existing.splice(i,1);break}
        };
        existing.unshift(obj);
        if(existing.length>3)existing.length=3;
        //键级LRU：delete+re-insert移到最新位，满100删最旧键
        delete prefMap[fullPinyin];
        if(Object.keys(prefMap).length>=100){
            delete prefMap[Object.keys(prefMap)[0]];
        };
        prefMap[fullPinyin]=existing;
        prefsDirty=true;
        
        //写入文本
        this.input(obj.word);
        //消费拼音：len>0按词长截断，len=0（未命中）清空全部拼音
        if(obj.len>0){
            this.pinyin=this.pinyin.substring(obj.len);
        }else{
            this.pinyin='';
        };
        this.updateCandidates();
    },
    clickSpace(){
        if(this.pinyin){
            this.clearCandidates()
        }else{
            this.input(' ');
        }
    },
    clickShear(w){
        this.closeAlert();
        this.input(w);
    },
    pressText(){
        if (!this.text) {
            this.sendMsg('请先输入文本');
            return
        };
        this.shearList.unshift(this.text);
        if (this.shearList.length>15)this.shearList.length=15;
        Vibrator.vibrate({
            mode: 'short',
        });
        this.sendMsg('已复制')
    },
    pressDelete(){
        clearInterval(timer_operate);
        Vibrator.vibrate({
            mode: 'short',
        });
        this.delete();
        timer_operate=setInterval(this.delete,80)
    },
    stopOperate(){
        clearInterval(timer_operate);
    },
    pressFn(e){
        clearInterval(timer_operate);
        let idx=Math.floor((e.globalX-31)/75);
        switch (idx){
            case 0://向左移动光标
                this.cursorLeft();
                timer_operate=setInterval(this.cursorLeft,80);
                Vibrator.vibrate({
                    mode: 'short',
                });
                break
            case 3://向右移动光标
                this.cursorRight();
                timer_operate=setInterval(this.cursorRight,80);
                Vibrator.vibrate({
                    mode: 'short',
                });
                break
        }
    },
    clickFn(e){
        clearInterval(timer_operate);
        let idx=Math.floor((e.globalX-31)/75);
        switch (idx){
            case 0://向左移动光标
                this.cursorLeft();
                break
            case 1:
                this.incKeyboard();
                break//切换键盘
            case 2:
                this.showPy=false;
                this.alertIf=true;
                this.alertShow=true;
                break //剪切板弹窗
            case 3://向右移动光标
                this.cursorRight();
                break
        }
    },
    //输入、删除、换行、光标移动逻辑
    //用\n将文档分为一个个‘段’，每个段由前面的文本和后面的\n组成
    //只有在段的开头，光标才可以在一行最开头，否则光标只能在行的末尾，此时继续右移、输入，光标直接来到下一行第一个字后面
    //段的末尾，必须有\n，当光标右移，遇到\n时，光标继续右移，不能将\n压入text，而是 如果有后续段，就把当前行压入，开启下一段编辑，文档末（无后续段）则不让移动
    //删除：逻辑为删除text中上一个字，若text中无字则删除上一段末尾\n，拼接两段，同样的，删除后来到上一行末尾而非当前行开头，因为不在段的开头

    //把当前行压入prevLines
    pushAllPrev(){
        this.prevLines+=this.text;
        this.lineWArr.push(textWidth);
        if (this.text[this.text.length-1]!=this.constN) {//此为中间处理状态，调用前先将\n推入text，所以可能存在\n
            this.prevLines+='\r';//手动分割
        };
        this.text='';
        textWidth=0;
    },
    //从prevLines获取完整一行到text
    pullAllPrev(){
        const fromIdx=this.prevLines.length-2;
        const pos=fromIdx<0?-1:Math.max(
            this.prevLines.lastIndexOf('\n',fromIdx),
            this.prevLines.lastIndexOf('\r',fromIdx)
        );
        this.text=this.prevLines.slice(pos+1,-1);
        if (this.prevLines[this.prevLines.length-1]==this.constN) this.nextText='\n';
        this.prevLines=this.prevLines.slice(0,pos+1);
        textWidth=this.lineWArr[this.lineWArr.length-1];
        this.lineWArr.pop();//在data中定义的数组，pop等操作的返回值会被框架拦截为undefined
    },
    //把nextText中文字推入nextLines，如果在段尾行但不在段尾，就连同\n的前一字推入
    // 若在段尾，只推\n，此时调用函数中应配合pushAllPrev来到新行开头
    pushNext(){
        const ch=this.nextText[this.nextText.length-1];
        this.nextText=this.nextText.slice(0,-1);
        this.nextLines=ch+this.nextLines;
        const cw=getFontWidth(ch);
        nextTextWidth-=cw;
        if (nextLineWArr.length) nextLineWArr[nextLineWArr.length-1]+=cw;
        else nextLineWArr.push(cw);
        if (ch==this.constN&&this.nextText) {
            //新的段推入nextLines，记录，因为\n不占宽度，视觉上也不显示，多推一个
            nextLineWArr.push(0)
        };
    },
    //把当前行全部推入nextLines
    pushAllNext(){
        this.nextLines=this.text+this.nextText+this.nextLines;
        if (this.nextText[this.nextText.length-1]==this.constN) {
            nextLineWArr.push(textWidth+nextTextWidth);
        }else {
            nextLineWArr[nextLineWArr.length-1]+=textWidth+nextTextWidth
        };
        this.text='';
        this.nextText='';
        textWidth=0;
        nextTextWidth=0;
    },
    //从nextLines抽字补充到nextText，直到把当前行填充满
    pullAllNext(){
        if (this.nextText[this.nextText.length-1]==this.constN)return;
        let idx=0;
        const s=this.nextLines;
        while (idx<s.length){
            const ch=s[idx++];
            this.nextText+=ch;
            const cw=getFontWidth(ch);
            if(ch==this.constN){
                nextLineWArr.pop();
                this.nextLines=s.substring(idx);  // ← 一次 trim
                return;
            };
            nextTextWidth+=cw;
            nextLineWArr[nextLineWArr.length-1]-=cw;
            if(textWidth+nextTextWidth>numOfLists){
                this.nextLines=s.substring(idx);  // ← 一次 trim
                this.pushNext();
                return;
            };
        };
        this.nextLines='';  // 全部消费完
    },
    input(w){
        let hasBreak=false;
        const handleWord=(w)=>{
            if (this.maxLen) {
                const len=getByteLen(w.charCodeAt(0));
                if (totalLen + len > this.maxLen) {
                    this.sendMsg('输入已达上限');
                    return
                };
                totalLen+=len;
            };
            const cw=getFontWidth(w);
            //加入后超宽
            while (cw+textWidth+nextTextWidth>numOfLists){
                //如果有nextText，就把nextText推出到nextLines，没有就光标移动到下一行开头输入，输入后正好在下一行第一个字后面
                if (this.nextText&&this.nextText!=this.constN) {
                    this.pushNext();
                }else {
                    this.pushAllPrev();
                    this.pullAllNext();
                    hasBreak=true;
                }
            };
            textWidth+=cw;
            this.text+=w;
        };
        if (w.length==1) {
            handleWord(w);
        }else {
            w.split('').forEach((e)=>handleWord(e));
        };
        if (hasBreak) this.scrollTo();
    },
    //结束或截断该段的编辑，创建新段
    enter(){
        if (this.maxLen) {
            if (totalLen+1>this.maxLen) {
                this.sendMsg('输入已达上限');
                return
            };
            totalLen++;
        };
        if (this.pinyin) {
            this.clearCandidates()
            return;
        };
        //当前编辑的文字推入过往字段
        this.text+='\n';
        this.pushAllPrev();
        //抽取nextLines补充nextText
        this.pullAllNext();
        this.scrollTo();
    },
    delete(){
        //拼音删除相关
        if (this.pinyin) {
            this.pinyin=this.pinyin.slice(0,-1);
            this.updateCandidates()
            return;
        };
        //段内删除
        if (this.text) {
            //如果text有内容，就类似输入删字一样拉字
            const w=this.text[this.text.length-1];
            const cw=getFontWidth(w);
            this.text=this.text.slice(0,-1);
            textWidth-=cw;
            if (this.maxLen) totalLen -= getByteLen(w.charCodeAt(0));
            //抽取nextLines补充nextText
            this.pullAllNext();
            //抽取补充完判断：如果在行首且不在段首，就移动光标到上一行末尾
            if (!this.text&&this.prevLines&&this.prevLines[this.prevLines.length-1]!=this.constN) {
                //如果此时在段末，不能把仅有\n的空行压入，而是替换prevLines末尾为\n
                let end=false;
                if (this.nextText==this.constN) {
                    this.nextText='';
                    end=true;
                };
                this.cursorLeft(false);
                if (end)this.nextText=this.nextText+this.constN;
            }
        }else {
            //段间删除，删除上一段末尾的\n，同时拉字补充
            if (!this.prevLines)return;
            //先移动光标到上一行，再删除nextText中\n，最后拉字补充
            this.cursorLeft(false);
            if (this.nextText==this.constN&&this.maxLen) totalLen--;
            this.nextText='';
            this.pullAllNext()
        };
        this.scrollTo();
    },
    cursorLeft(ani=true){
        //将text中字符拉到nextText中，以实现光标移动效果
        //段内移动
        if (this.text) {
            const ch=this.text[this.text.length-1];
            this.text=this.text.slice(0,-1);
            this.nextText=ch+this.nextText;
            const wd=getFontWidth(ch);
            textWidth-=wd;
            nextTextWidth+=wd;
            //移动完判断：如果在行首且不在段首，就移动光标到上一行末尾,即当前行压入下一行，上一行压入当前行
            if (!this.text&&this.prevLines&&this.prevLines[this.prevLines.length-1]!=this.constN) {
                this.pushAllNext();
                this.pullAllPrev();
                if (ani)this.scrollTo();
            };
        }else {
            //段间移动,此时无text，nextText占满或存在\n，压入nextLines
            if (!this.prevLines)return;
            this.pushAllNext();
            this.pullAllPrev();
            if (ani)this.scrollTo();
        }
    },
    cursorRight(){
        //段间移动
        if (this.nextText=='\n') {
            if (!this.nextLines) return;
            this.text+='\n';
            this.nextText='';
            this.pushAllPrev();
            this.pullAllNext();
            this.scrollTo();
        }else {
            if (this.nextText) {
                const ch=this.nextText[0];
                this.text+=ch;
                this.nextText=this.nextText.slice(1);
                const cw=getFontWidth(ch);
                textWidth+=cw;
                nextTextWidth-=cw;
                return;
            };
            //行间移动，移动到下一行第一个文字后面
            this.pushAllPrev();
            this.pullAllNext();
            //此时光标在行首，递归调用right
            this.cursorRight();
            this.scrollTo();
        }
    },

    //弹窗相关
    expandPy(e){
        if (e.globalX>55)return;
        clearTimeout(timer_alert);
        if (this.pyFullList.length==0){
            timer_alert=setTimeout(()=>{
                this.searchWithFallback(updateCount,this.pinyin.toLowerCase(),[],{},100);
            },300)//弹窗打开存在300ms动画
        };
        this.showPy=true;
        this.alertShow=true;
        this.alertIf=true;
    },
    closeAlert(e={type:'click'}){
        if(e.type=='click'||(e.direction=='right'&&e.distance>=200)){
            clearTimeout(timer_alert);
            this.alertShow=false;
        }
    },
    //表冠引擎
    listenCrown(e){
        clearTimeout(timer_focus);
        clearInterval(timer_ani);
        let value=e.value;
        if (this.linePos>0) {
            let gap=this.linePos;
            this.linePos=Math.min(100,this.linePos+(this.focusValue-value)*30*(1-gap/100));
            timer_focus=setTimeout(()=>{moveKey=false;this.back(0)},50)
        }else if(this.linePos<lineHeight){
            let gap=lineHeight-this.linePos;
            this.linePos=Math.max(lineHeight-100,this.linePos+(this.focusValue-value)*30*(1-gap/100));
            timer_focus=setTimeout(()=>{moveKey=false;this.back(lineHeight)},50)
        }else {
            this.linePos+=(this.focusValue-value)*30;
        };
        this.focusValue=value;
        if (this.focusValue==0||this.focusValue==100) {
            this.focusValue=50
        }
    },
    //键盘移动逻辑
    touchStart(target,e){
        clearInterval(timer_ani);
        //如果切换动画被中断，立即完成切换
        if(this.aniPos){
            this.keyType=this.aniType;
            if(this.aniPos>0){
                this.keyPos=0;
                this.aniDotPos=0;
            }else{
                this.keyPos=this.aniPos+466;
                this.aniDotPos=100;
            };
            this.aniPos=0;
            this.aniOpacity=0;
        };
        moveKey=target;
        oriX=e.globalX;
        oriY=e.globalY;
        timeArr.unshift(e.timestamp);
    },
    touchMove(e){
        if (moveKey) {
            let maxLimit=this.keyType==3?-275:-104;
            let distance=0;
            distance=e.globalX-oriX;
            if (this.keyPos>=0&&distance>0) {
                let gap=this.keyPos;
                this.keyPos=Math.min(80,this.keyPos+distance*(1-gap/85))
            }else if (this.keyPos<=maxLimit&&distance<0) {
                let gap=maxLimit-this.keyPos;
                this.keyPos=Math.max(maxLimit-80,this.keyPos+distance*(1-gap/85))
            }else {
                this.keyPos+=distance;
            };
            disArr.unshift(distance);
        }else {
            let distance=0;
            distance=e.globalY-oriY;
            if (this.linePos>=0&&distance>0) {
                let gap=this.linePos;
                this.linePos=Math.min(80,this.linePos+distance*(1-gap/85))
            }else if (this.linePos<=lineHeight&&distance<0) {
                let gap=lineHeight-this.linePos;
                this.linePos=Math.max(lineHeight-80,this.linePos+distance*(1-gap/85))
            }else {
                this.linePos+=distance;
            };
            disArr.unshift(distance);
        }
        timeArr.unshift(e.timestamp);
        if(timeArr.length>4)timeArr.length=4;
        if(disArr.length>3)disArr.length=3;
        oriX=e.globalX;
        oriY=e.globalY;
    },
    touchEnd(){
        let maxLimit=this.keyType==3?-275:-104;
        //结束时的处理
        if (moveKey){
            if (this.keyPos>0) {
                if(this.keyPos>60)this.decKeyboard();
                else this.back(0);
            }else if (this.keyPos<maxLimit){
                if(this.keyPos<maxLimit-60 )this.incKeyboard();
                else this.back(maxLimit)
            }else this.inertia()
        }else {
            if (this.linePos>0) {
                this.back(0);
            }else if (this.linePos<lineHeight){
                this.back(lineHeight)
            }else this.inertia()
        };
        disArr.length=0;
        timeArr.length=0;
    },
    //惯性动画
    inertia(){
        //计算最后三次滑动平均速度，提交给惯性函数
        let totalDist = 0;
        let totalShift = 0;
        const n = Math.min(disArr.length, timeArr.length - 1);
        if (n > 0) {
            for (let i = 0; i < n; i++) {
                totalDist += Math.abs(disArr[i])//移动总距离
                totalShift += disArr[i]//;移动总位移
            };
            const totalTime = timeArr[0] - timeArr[n];
            let v=Math.sign(totalShift)*Math.min(totalDist / totalTime,12);

            clearInterval(timer_ani);
            let vel = v * 22; // px/ms → px/帧
            const that=this;
            let oneFrame;
            if (moveKey) {
                let maxLimit=this.keyType==3?-275:-104;
                oneFrame=()=>{
                    if (that.keyPos>=0) {
                        let gap=that.keyPos;
                        vel*=0.5-0.5*(gap/40);
                        that.keyPos+=vel;
                        if (that.keyPos>=40) {
                            that.back(0);
                            return;
                        };
                    }else if(that.keyPos<=maxLimit){
                        let gap=maxLimit-that.keyPos;
                        vel*=0.5-0.5*(gap/40);
                        that.keyPos+=vel;
                        if (that.keyPos<=maxLimit-40) {
                            that.back(maxLimit);
                            return;
                        };
                    }else {
                        that.keyPos+=vel;
                        vel *= 0.5;
                    };
                    if (Math.abs(vel) < 0.3) {
                        if (that.keyPos > 0) {
                            that.back(0);
                        } else if (that.keyPos <=maxLimit) {
                            that.back(maxLimit);
                        }else clearInterval(timer_ani);
                    };
                };
            }else{
                oneFrame=()=>{
                    if (that.linePos>=0) {
                        let gap=that.linePos;
                        vel*=0.5-0.5*(gap/80);
                        that.linePos+=vel;
                        if (that.linePos>=80) {
                            that.back(0);
                            return;
                        };
                    }else if(that.linePos<=lineHeight){
                        let gap=lineHeight-that.linePos;
                        vel*=0.5-0.5*(gap/40);
                        that.linePos+=vel;
                        if (that.linePos<=lineHeight-80) {
                            that.back(lineHeight);
                            return;
                        };
                    }else {
                        that.linePos+=vel;
                        vel *= 0.5;
                    };
                    if (Math.abs(vel) < 0.3) {
                        if (that.linePos > 0) {
                            that.back(0);
                        } else if (that.linePos <=lineHeight) {
                            that.back(lineHeight);
                        }else clearInterval(timer_ani);
                    };
                };
            }
            if (!oneFrame)return;
            oneFrame();
            timer_ani = setInterval(oneFrame, 33);
        };
    },
    //移动动画
    back(end){
        clearInterval(timer_ani);
        const that=this;
        let lastTime=Date.now();
        const getStep=()=>{
            const now=Date.now();
            const step=1-Math.pow(0.6,Math.min((now-lastTime)/22,4));
            lastTime=now;
            return step;
        };
        let fn;
        if (moveKey){
            fn=() => {
                const diff = end - that.keyPos;
                if (Math.abs(diff) < 0.1) {
                    that.keyPos = end;
                    clearInterval(timer_ani);
                } else {
                    that.keyPos += diff * getStep();
                }}
        }else {
            fn=() => {
                const diff = end - that.linePos;
                if (Math.abs(diff) < 0.1) {
                    that.linePos = end;
                    clearInterval(timer_ani);
                } else {
                    that.linePos += diff * getStep();
                }}
        };
        timer_ani = setInterval(fn, 33);
    },
    scrollTo(){
        lineHeight=this.lineWArr.length+1;
        nextLineWArr.forEach((w)=>{
            if (w==0) lineHeight++;
            lineHeight+=Math.ceil(w/numOfLists);
        });
        lineHeight*=-38;
        moveKey=false;
        this.back(this.lineWArr.length*-38);
    },
    //左滑
    incKeyboard(){
        if (this.pinyin) {
            this.clearCandidates()
        };
        //如果切换动画被中断，立即完成切换
        if(this.aniPos){
            this.keyType=this.aniType;
            if(this.aniPos>0){
                this.keyPos=0;
            }else{
                this.keyPos=this.aniPos+466;
            };
        };
        this.aniType=(this.keyType+1)%4;
        this.aniPos=this.keyType==3?741:570;
        this.aniOpacity=0;
        this.aniDotPos=100;
        this.move(this.keyType==3?-741:-570,0)
    },
    //右滑
    decKeyboard(){
        if (this.pinyin) {
            this.clearCandidates()
        };
        //如果切换动画被中断，立即完成切换
        if(this.aniPos){
            this.keyType=this.aniType;
            if(this.aniPos>0){
                this.keyPos=0;
            }else{
                this.keyPos=this.aniPos+466;
            };
        };
        this.aniType=(this.keyType+3)%4;
        this.aniPos=this.aniType==3?-741:-570;
        this.aniOpacity=0;
        this.aniDotPos=0;
        this.move(466,100);
    },
    move(target_key,target_dot){
        clearInterval(timer_ani);
        const duration=500;
        const start_key=this.keyPos;
        const start_dot=this.aniDotPos;
        const startTime=Date.now();
        timer_ani=setInterval(()=>{
            const t=(Date.now()-startTime)/duration;
            if(t>=1){
                clearInterval(timer_ani);
                this.keyPos=target_key;
                this.aniDotPos=target_dot;
                this.keyType=this.aniType;
                this.keyPos=this.aniPos+this.keyPos;
                this.aniPos=0;
                this.aniOpacity=0;
            }else{
                const d=easeOutBack(t);
                this.aniOpacity=d;
                this.keyPos=start_key+(target_key-start_key)*d;
                this.aniDotPos=start_dot+(target_dot-start_dot)*d;
            }
        },33);
    },
    //拼音候选搜索
    clearCandidates(){
        this.pyFullList=[];
        this.pyList=[];
        this.input(this.pinyin);
        this.pinyin='';
        updateCount++;
        if (this.alertShow) this.closeAlert();
    },
    updateCandidates(){
        this.pyFullList=[];
        if (this.alertShow) this.closeAlert();
        if(!this.pinyin)return;
        this.searchWithFallback(++updateCount,this.pinyin.toLowerCase(),[],{});
    },
    searchWithFallback(thisUpdateCount, key, allCandidates, seenWords ,length=20) {
        if (thisUpdateCount !== updateCount) return;
        // 递归终止条件
        if (!key || allCandidates.length >= length) {
            if (length==20) {
                this.pyList=this.applyPrefs(allCandidates)
            }else this.setExpandedCandidate(this.applyPrefs(allCandidates))
            return;
        };
        lookupDict.lookupDict(
            "internal://app/rawfile/pinyinDictV5_20260416",
            key,
            (actualKey, actualValue) => {
                if (thisUpdateCount !== updateCount) return;
                if (actualValue) {
                    actualValue.split(" ").slice(0, length - allCandidates.length).forEach(word => {
                        if (!seenWords[word]) {
                            seenWords[word] = true;
                            allCandidates.push({ word: word, len: actualKey.length });
                        }
                    });
                };
                if (allCandidates.length < length && actualKey && actualKey.length > 1) {
                    setTimeout(() => this.searchWithFallback(thisUpdateCount, actualKey.substring(0, actualKey.length - 1), allCandidates, seenWords, length), 0);
                } else {
                    if (length==20) {
                        this.pyList=this.applyPrefs(allCandidates)
                    }else this.setExpandedCandidate(this.applyPrefs(allCandidates))
                    }
            }
        );
    },
    applyPrefs(allCandidates){
        const prefs=prefMap[this.pinyin];
        if(prefs&&prefs.length>0&&allCandidates.length>0){
            for(let p=0;p<prefs.length;p++){
                for(let i=0;i<allCandidates.length;i++){
                    if(allCandidates[i].word===prefs[p].word){
                        allCandidates.splice(i,1);
                        break;
                    }
                }
            };
            return prefs.concat(allCandidates);
        };
        return allCandidates;
    },
    setExpandedCandidate(candidates){
        let arr=[];
        for (let i = 0; i < candidates.length; i+=4) {
            arr.push([
                candidates[i]?candidates[i]:'',
                candidates[i+1]?candidates[i+1]:'',
                candidates[i+2]?candidates[i+2]:'',
                candidates[i+3]?candidates[i+3]:'',
            ]);
        };
        this.pyFullList=arr;
    },
    loadPrefs(){
        File.get({
            uri:"internal://app/pyref.json",
            success:(info)=>{
                const fileLen=info.length;
                if(fileLen===0)return;
                let pos=0;
                let result="";
                function readChunk(){
                    const chunkLen=Math.min(4096,fileLen-pos);
                    if(chunkLen<=0){
                        try{prefMap=JSON.parse(result)}catch(e){prefMap={}};
                        return;
                    }
                    File.readText({
                        uri:"internal://app/pyref.json",
                        position:pos,
                        length:chunkLen,
                        success:(data)=>{
                            result+=data.text;
                            pos+=chunkLen;
                            setTimeout(readChunk,0);
                        },
                        fail:()=>{prefMap={}}
                    });
                }
                readChunk();
            },
            fail:()=>{}
        });
    },
    savePrefs(){
        let json=JSON.stringify(prefMap);
        let escaped="";
        for(let i=0;i<json.length;i++){
            const code=json.charCodeAt(i);
            if(code>127){
                const hex=code.toString(16);
                let padded="";
                for(let p=hex.length;p<4;p++)padded+="0";
                escaped+="\\u"+padded+hex;
            }else{
                escaped+=json[i];
            }
        }
        File.writeText({
            uri:"internal://app/pyref.json",
            text:escaped,
        });
    },
    sendMsg(msg,interval=1000){
        clearTimeout(this.msg.timer);
        this.msg.content=msg;
        this.msg.timer=setTimeout(this.closeMsg,interval)
    },
    closeMsg(){
        clearTimeout(this.msg.timer);
        this.msg.content='';
        this.msg.timer=null
    },
    grabClick(){}
};
// 字符宽度表（真机实测，0x00-0x7F + 0xB7）
var W=[
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0.27,32/128,48/128,20/30,74/128,24/30,22/30,26/128,11/30,11/30,57/128,0.57,8/30,15/30,31/128,52/128,
    147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,8/30,35/128,74/128,74/128,74/128,58/128,
    126/128,21/30,20/30,20/30,22/30,77/128,73/128,91/128,23/30,35/128,62/128,90/128,73/128,111/128,96/128,99/128,
    78/128,99/128,20/30,74/128,75/128,95/128,87/128,126/128,87/128,82/128,75/128,11/30,52/128,11/30,15/30,56/128,
    41/128,17/30,79/128,64/128,79/128,17/30,11/30,79/128,18/30,8/30,8/30,70/128,8/30,26/30,18/30,18/30,
    79/128,79/128,12/30,14/30,12/30,18/30,16/30,24/30,66/128,69/128,61/128,49/128,26/128,49/128,74/128,0
];
W[0xB7]=15/30;
W[0xB1]=17/30;W[0xD7]=17/30;W[0xF7]=17/30;
W[0x3C0]=18/30;
W[0x2018]=41/128;W[0x2019]=41/128;W[0x201C]=15/30;W[0x201D]=15/30;
W[0x2014]=1;W[0x2026]=1;W[0x3001]=1;W[0x3002]=1;
W[0x300A]=1;W[0x300B]=1;W[0x3010]=1;W[0x3011]=1;
W[0x221A]=22/30;W[0x221E]=1;
W[0x2248]=17/30;W[0x2260]=17/30;W[0x2264]=17/30;W[0x2265]=17/30;
W[0x2211]=17/30;
W[0xFF01]=1;W[0xFF08]=1;W[0xFF09]=1;W[0xFF0C]=1;
W[0xFF1A]=1;W[0xFF1B]=1;W[0xFF1F]=1;W[0xFFE5]=1;
function getFontWidth(w){
    const cw=W[w.charCodeAt(0)];
    return cw!==undefined?Math.ceil(cw*30-1e-6)/30:1;//对齐text组件换行算法：比例×30向上取整（-1e-6消除浮点误差）
};
function getByteLen(code) {
    if (code <= 0x7F) return 1;                 // ASCII
    if (code <= 0x7FF) return 2;                // 扩展拉丁等
    if (code >= 0xD800 && code <= 0xDBFF) return 1;  // 高位代理（不完整）
    return 3;                                    // 中文字等 BMP 字符
};
