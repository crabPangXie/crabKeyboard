import Router from '@system.router';

/*
 * CrabKeyboard v1.1.0 更新日志
 * 更新日期：2026-10-01
 * 新增 flash 轻量词库，仅保留单字和双字词语；使用轻量词库并移除全量词库后，
 * 本次发布包体约 3.5 MB，体积减少约 50%（具体大小取决于构建配置和所含资源）。
 * 优化键盘切换触发阈值和拖动阻尼，减少误触。
 * 增加点击、长按键入反馈。
 * 增加光标连续移动时的常亮显示，松手后恢复闪烁。
 * 优化换行显示逻辑，前方文本、当前编辑行和后续文本独立定位，
 * 后续文本仍由系统自动换行，减少错位与字符重叠，不增加程序重排开销。
 * 增强键盘长按小字的字重与亮度，提高可读性。
 * 修复已知 bug。
 */

export default {
    data: {
        value:''
    },
    onInit() {
        console.log(this.value)
    },
    openKeyboard(type) {
        Router.replace({
            uri:'/pages/keyboard_'+type+'/keyboard',
            params:{
                targetPage:'/pages/index/index',
                backPage:'/pages/index/index',
                targetKey:'value',
                prompt:'请输入文字',
                maxLen:0,
                forbidden:'',
                allowNewline:true,
                keyType:0
            }
        })
    }
}
