# CrabKeyboard

HarmonyOS LiteWearable HML 键盘页面。本 README 只说明如何在其他业务页面中接入，不重复介绍键盘内部实现。

## 接入步骤

以下路径以 `entry/src/main` 为例。

### 1. 复制字典文件

将完整字典目录复制到自己的 `rawfile`：

```text
entry/src/main/resources/rawfile/pinyinDictV5_20260416/
```

目录名和其中的 `key*.dat`、`value*.dat` 文件必须保持不变。键盘默认读取：

```text
internal://app/rawfile/pinyinDictV5_20260416
```

如果修改目录名，需要同步修改 `keyboard_rect/keyboard.js` 和 `keyboard_circle/keyboard.js` 中的 rawfile 路径。

### 2. 复制键盘页面

将需要的页面目录复制到自己的 `pages` 目录：

```text
entry/src/main/js/default/pages/keyboard_rect/
entry/src/main/js/default/pages/keyboard_circle/
```

每个目录包含：

```text
keyboard.hml
keyboard.css
keyboard.js
```

只需要一种表盘时，可以只复制对应目录。

### 3. 复制公共素材

将整个目录复制到自己项目的 `common` 目录：

```text
entry/src/main/js/default/common/keyboard/
```

必须保留以下结构：

```text
common/keyboard/
├── circle/
├── common/
├── rect/
└── lookupDictV5.js
```

不要修改目录和文件名。页面使用 `/common/keyboard/...` 的资源路径，`lookupDictV5.js` 也必须一起复制。

### 4. 注册页面

在 `entry/src/main/config.json` 的 `module.js[0].pages` 中加入实际使用的页面：

```json
"pages": [
    "pages/index/index",
    "pages/keyboard_rect/keyboard",
    "pages/keyboard_circle/keyboard"
]
```

如果只复制了一种键盘，只注册对应的一项。

## 从业务页面打开键盘

业务页面需要准备一个用于接收结果的 `data` 字段，并通过路由参数打开键盘：

```javascript
import Router from '@system.router';

export default {
    data: {
        content: ''
    },
    openKeyboard() {
        Router.replace({
            uri: '/pages/keyboard_rect/keyboard',
            params: {
                targetPage: '/pages/form/form',
                backPage: '/pages/form/form',
                targetKey: 'content',
                prompt: '请输入内容',
                maxLen: 0,
                forbidden: '',
                allowNewline: true,
                keyType: 0
            }
        });
    }
};
```

`targetKey` 必须与目标页面 `data` 中的字段名一致。输入完成后，键盘通过路由参数把结果写回该字段。

### 路由参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `targetPage` | 是 | 输入完成后返回的页面路径。 |
| `targetKey` | 是 | 目标页面接收输入结果的字段名。 |
| `backPage` | 否 | 取消编辑时返回的页面，未设置时使用 `targetPage`。 |
| `prompt` | 否 | 空输入时的提示文字。 |
| `maxLen` | 否 | 最大输入长度，`0` 表示不限制；当前按字节数统计。 |
| `forbidden` | 否 | 禁止输入的字符集合，不是正则表达式。 |
| `allowNewline` | 否 | 是否允许换行。 |
| `keyType` | 否 | 初始键盘：`0` 中文、`1` 小写、`2` 大写、`3` 符号。 |

## 其他页面接入剪切板

### 数据约定

剪切板使用应用私有文件：

```text
internal://app/shear.json
```

文件内容为字符串数组，最新内容在第 0 项，最多保存 15 项：

```json
["最新内容", "上一条内容"]
```

这不是系统剪切板，只能在同一个应用内共享。

### 读取和保存

在需要使用剪切板的页面中加入 `shearList`，页面初始化时读取，销毁时保存：

```javascript
import File from '@system.file';

onInit() {
    File.readText({
        uri: 'internal://app/shear.json',
        success: (data) => {
            if (data.text) {
                this.shearList = JSON.parse(data.text);
            }
        }
    });
},
onDestroy() {
    File.writeText({
        uri: 'internal://app/shear.json',
        text: JSON.stringify(this.shearList)
    });
}
```

### 参考设备参数页面接入

设备参数列表使用 `{name, value}`，在 HML 中给每条参数增加长按事件：

```hml
<list-item class="item" for="{{list}}" on:longpress="copyInfo($idx)">
    <text>{{$item.name}}</text>
    <text>{{$item.value}}</text>
</list-item>
```

在页面 JS 中将对应值写入剪切板：

```javascript
copyInfo(idx) {
    this.shearList.unshift(String(this.list[idx].value));
    if (this.shearList.length > 15) {
        this.shearList.length = 15;
    }
}
```

这样长按设备参数卡片后，参数值会进入 `shear.json`；再次打开 CrabKeyboard 的剪切板弹窗即可选择并插入当前输入位置。

### 普通页面写入文本

文本编辑器、脚本编辑器、文件管理器等页面只需要把要复制的文本传入相同逻辑：

```javascript
addToClipboard(text) {
    this.shearList.unshift(String(text));
    if (this.shearList.length > 15) {
        this.shearList.length = 15;
    }
}
```

页面退出前保存 `shearList`。如果需要复制后立即持久化，可以在 `addToClipboard` 末尾直接调用 `File.writeText`。

## 检查清单

- 字典目录已复制到 `resources/rawfile`。
- `pages/keyboard_rect` 或 `pages/keyboard_circle` 已复制。
- `common/keyboard` 已完整复制。
- 键盘页面已注册到 `config.json`。
- `targetPage` 和 `targetKey` 已正确配置。
- 剪切板读写统一使用 `internal://app/shear.json`。

## License

MIT License，详见 [LICENSE](LICENSE)。
