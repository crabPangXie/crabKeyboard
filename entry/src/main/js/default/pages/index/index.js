import Router from '@system.router';

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
