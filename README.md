# CrabKeyboard

当前版本：**1.1.5** · 更新日期：**2026-10-01**

## 更新日志

### v1.1.5 · 2026-10-01

- 新增按键上滑输入：按住按键向上滑动，可直接输入对应的上层字符（大写、符号等）。
- 增加剪切板、列表的表冠调用。
- 优化候选词选择体验，扩大候选词点击区域。
- 修复切换键盘或滚动文本时可能出现的报错。

### v1.1.0 · 2026-10-01

- 新增 **flash 轻量词库**，仅保留单字和双字词语；使用轻量词库并移除全量词库后，本次发布包体约 **3.5 MB**，体积减少约 **50%**。
- 优化键盘切换触发阈值和拖动阻尼，减少误触。
- 增加键入反馈：点击和长按按键时显示字符提示。
- 增加光标连续移动时的常亮显示，松手后恢复闪烁。
- 修复行间文本重叠问题。
- 增强键盘长按小字的字重和亮度，提高可读性。
- 修复已知 bug。

包体数据为本次发布说明中的参考值，实际大小受构建模式、表盘页面及所含资源影响；词库文件大小与完整安装包大小不同。

## 演示视频

[观看螃蟹输入法演示](docs/crab-keyboard-demo.mp4)

## 功能介绍

CrabKeyboard 是面向 HarmonyOS LiteWearable 的多功能输入组件，提供：

- 中文拼音输入和候选词选择
- 支持连续输入多字拼音；选中候选词后按匹配长度消费已匹配拼音，剩余拼音继续参与候选匹配
- 输入偏好学习：记录候选词选择结果并优先展示常用候选；每个拼音最多保存 3 个偏好词，最多保留 100 组拼音偏好
- 英文大小写、数字和符号输入
- 按键上滑直接输入上层字符，无需切换键盘
- 左右滑动切换键盘布局
- 删除、光标移动、换行及长按连续操作
- 剪切板历史记录和候选词扩展
- 支持矩形与圆形表盘布局
- 可通过路由参数接入其他业务页面

## 词库介绍与切换

两套词库使用相同的 `key*.dat` / `value*.dat` 索引格式，共用 `lookupDictV5.js` 读取器，无需更改查询逻辑。

| 对比项 | flash 轻量词库（默认） | 全量词库 |
| --- | --- | --- |
| 目录 | `pinyinDictV5_flash1001` | `pinyinDictV5_20260416` |
| 词库文件合计大小 | 1,136,195 字节，约 **1.14 MB** | 3,909,006 字节，约 **3.91 MB** |
| 收录范围 | 单字、双字词语 | 单字、双字及三字以上词语 |
| 多字文本输入 | 通过单字、双字候选分段组合输入 | 可直接选择词库中收录的较长词语 |
| 候选排序 | 保留原词库中剩余候选的顺序 | 原始候选顺序 |
| 适合场景 | 包体受限、日常短文本输入 | 更重视长词候选覆盖的场景 |

flash 由全量词库过滤掉超过两个字的词条并重建索引而来，词库文件体积减少约 **70.93%**。两者均保留拼音前缀回退查询和输入偏好功能；切换词库不影响英文、数字、符号及剪切板功能。表中 MB 按 1,000,000 字节计算。

### 如何切换词库

在 `keyboard_rect/keyboard.js` 和 `keyboard_circle/keyboard.js` 顶部，二选一取消注释：

```javascript
// 轻量
const dictPath='internal://app/rawfile/pinyinDictV5_flash1001';
// 全量
// const dictPath='internal://app/rawfile/pinyinDictV5_20260416';
```

然后确保 `entry/src/main/resources/rawfile/` 下只保留要用的那一个词库目录，重新构建即可。

本仓库同时保留了两套词库，默认使用 flash。两个目录都保留时不会减小包体，需要得到约 3.5 MB 的包体时，请先移出未使用的词库目录（建议存放到项目资源目录之外）。

## 接入步骤

以下路径以 `entry/src/main` 为例。

### 1. 复制字典文件

默认使用 flash 轻量词库，将完整目录复制到自己的 `rawfile`：

```text
entry/src/main/resources/rawfile/pinyinDictV5_flash1001/
```

目录名和其中的 `key*.dat`、`value*.dat` 文件必须保持不变。键盘默认读取：

```text
internal://app/rawfile/pinyinDictV5_flash1001
```

如果需要全量词库，请按上方“如何切换词库”操作；修改目录名时，需要同步修改两种键盘页面中的 `dictPath`。

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
