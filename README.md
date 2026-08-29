# CrabKeyboard

适用于 HarmonyOS LiteWearable 的开源自定义中文键盘，支持圆形与矩形表盘、拼音输入、候选词选择及自定义输入参数。

## 功能介绍

- 支持圆形表盘和矩形表盘两套键盘界面。
- 支持中文拼音输入，并实时显示候选词。
- 支持展开候选词列表，方便选择更多匹配结果。
- 支持中文、英文小写、英文大写和符号四种键盘类型。
- 支持通过滑动切换键盘类型。
- 支持删除、长按连续删除、空格、换行、完成和取消操作。
- 支持光标左右移动和文本区域滚动。
- 支持通过表冠滚动多行文本。
- 支持输入长度限制和禁止字符校验。
- 支持长按当前编辑行进行复制，并保存最多 15 条剪切板记录。
- 会记录常用候选词，使后续候选词排序更符合使用习惯。
- 根据设备 API 版本和屏幕形状自动选择字体。
- 使用 rawfile 中的拼音索引字典，不依赖网络，适合手表等 LiteWearable 设备。

## 项目结构

```text
entry/src/main/
├── js/default/
│   ├── common/keyboard/
│   │   ├── circle/                 # 圆形表盘专用图片
│   │   ├── common/                 # 两种键盘共用图片
│   │   ├── rect/                   # 矩形表盘专用图片
│   │   └── lookupDictV5.js         # 拼音字典读取模块
│   └── pages/
│       ├── keyboard_circle/        # 圆形键盘页面
│       ├── keyboard_rect/          # 矩形键盘页面
│       └── index/                  # 示例主页
└── resources/rawfile/
    └── pinyinDictV5_20260416/      # 拼音索引字典
```

## 快速使用

示例主页通过路由打开矩形键盘：

```javascript
import Router from '@system.router';

export default {
    data: {
        value: ''
    },
    openKeyboard() {
        Router.replace({
            uri: '/pages/keyboard_rect/keyboard',
            params: {
                targetPage: '/pages/index/index',
                backPage: '/pages/index/index',
                targetKey: 'value',
                prompt: '请输入文字',
                maxLen: 0,
                forbidden: '',
                allowNewline: true,
                keyType: 0
            }
        });
    }
};
```

输入完成后，键盘页面会通过路由参数把结果返回到 `targetPage`。示例中 `targetKey` 为 `value`，因此主页的 `data.value` 会接收到输入结果。

## 自定义参数

键盘页面通过 `Router.replace` 的 `params` 接收配置。参数必须使用下面的字段名：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `targetPage` | `string` | 是 | 输入完成后返回的目标页面路径，例如 `/pages/form/form`。 |
| `backPage` | `string` | 否 | 放弃编辑时返回的页面路径。为空时使用 `targetPage`。 |
| `targetKey` | `string` | 是 | 目标页面接收结果的字段名，必须与目标页面 `data` 中的字段一致。 |
| `prompt` | `string` | 否 | 输入框为空时显示的提示文字，默认值为 `请输入文字`。 |
| `maxLen` | `number` | 否 | 最大输入长度，`0` 表示不限制。当前实现按字节数统计，ASCII 字符通常占 1 字节，中文通常占 3 字节。 |
| `forbidden` | `string` | 否 | 禁止输入的字符集合，例如 `，。！？`。这是按字符匹配，不是正则表达式。为空表示不限制。 |
| `allowNewline` | `boolean` | 否 | 是否允许换行。为 `true` 时底部按钮为换行，为 `false` 时底部按钮为完成/搜索。 |
| `keyType` | `number` | 否 | 初始键盘类型：`0` 中文，`1` 英文小写，`2` 英文大写，`3` 符号。 |

### 自定义调用示例

下面示例打开圆形键盘，用于编辑昵称：

```javascript
import Router from '@system.router';

export default {
    data: {
        nickname: ''
    },
    editNickname() {
        Router.replace({
            uri: '/pages/keyboard_circle/keyboard',
            params: {
                targetPage: '/pages/profile/profile',
                backPage: '/pages/profile/profile',
                targetKey: 'nickname',
                prompt: '请输入昵称',
                maxLen: 12,
                forbidden: '，。！？',
                allowNewline: false,
                keyType: 0
            }
        });
    }
};
```

目标页面需要准备同名字段：

```javascript
export default {
    data: {
        nickname: ''
    }
};
```

键盘完成输入后，`nickname` 会被更新为用户输入的文本。取消编辑时，键盘会向 `targetKey` 写入空字符串并返回 `backPage`；如果没有配置 `backPage`，则返回 `targetPage`。

## 加入到自己的项目

以下步骤适用于使用 HML、CSS 和 JS 的 HarmonyOS LiteWearable 项目。假设你的业务模块仍然使用 `entry/src/main` 目录。

### 1. 将字典文件加入 rawfile

把项目中的整个字典目录复制到自己项目的 `rawfile` 目录：

```text
crabKeyboard/entry/src/main/resources/rawfile/pinyinDictV5_20260416/
    -> 你的项目/entry/src/main/resources/rawfile/pinyinDictV5_20260416/
```

必须完整复制目录内的 `key*.dat` 和 `value*.dat` 文件，并保持以下目录名和文件名不变：

```text
entry/src/main/resources/rawfile/pinyinDictV5_20260416/
├── key*.dat
└── value*.dat
```

键盘代码通过下面的路径读取字典：

```javascript
internal://app/rawfile/pinyinDictV5_20260416
```

如果需要修改字典目录名，必须同时修改以下两个文件中的读取路径：

```text
entry/src/main/js/default/pages/keyboard_rect/keyboard.js
entry/src/main/js/default/pages/keyboard_circle/keyboard.js
```

并将其中的 `internal://app/rawfile/pinyinDictV5_20260416` 改成新的 rawfile 路径。

### 2. 加入键盘界面

将下面两个目录复制到自己项目的 `pages` 目录：

```text
entry/src/main/js/default/pages/keyboard_rect/
entry/src/main/js/default/pages/keyboard_circle/
```

每个目录都需要完整复制以下文件：

```text
keyboard.hml
keyboard.css
keyboard.js
```

如果只需要一种表盘形状，可以只复制对应的目录。复制完成后，检查键盘 JS 文件中的字典模块引用：

```javascript
import lookupDict from '../../common/keyboard/lookupDictV5';
```

如果你把页面放到了不同层级，需要按实际目录层级调整这个相对路径。

还需要在自己的 `entry/src/main/config.json` 中注册页面。将键盘页面加入 `module.js[0].pages`：

```json
{
  "module": {
    "js": [
      {
        "name": "default",
        "pages": [
          "pages/index/index",
          "pages/keyboard_circle/keyboard",
          "pages/keyboard_rect/keyboard"
        ]
      }
    ]
  }
}
```

如果配置文件中已经存在 `pages` 数组，只需要追加下面两项，不要重复创建 `js` 配置：

```text
pages/keyboard_circle/keyboard
pages/keyboard_rect/keyboard
```

### 3. 在 common 中加入 keyboard 素材

将整个公共素材目录复制到自己项目的 `common` 目录：

```text
crabKeyboard/entry/src/main/js/default/common/keyboard/
    -> 你的项目/entry/src/main/js/default/common/keyboard/
```

目录结构必须保持为：

```text
entry/src/main/js/default/common/keyboard/
├── circle/
│   ├── confirm.png
│   ├── confirm0.png
│   ├── delete.png
│   ├── enter.png
│   ├── search.png
│   └── space.png
├── common/
│   ├── 0.png
│   ├── 1.png
│   ├── 2.png
│   ├── 3.png
│   ├── close.png
│   ├── dot.png
│   ├── key0.png
│   ├── key1.png
│   ├── key2.png
│   ├── key3.png
│   ├── pyShadow.png
│   ├── selectBar.png
│   ├── shadow.png
│   ├── switchL.png
│   ├── switchR.png
│   ├── toolBar.png
│   └── toolCover.png
├── lookupDictV5.js
└── rect/
    ├── cancel.png
    ├── confirm.png
    ├── confirm0.png
    ├── delete.png
    ├── enter.png
    ├── search.png
    └── space.png
```

不要随意修改素材目录名。键盘 HML 使用 `/common/keyboard/...` 的绝对资源路径，目录或文件名不一致会导致按钮、键盘背景或候选栏素材无法显示。

### 4. 在业务页面打开键盘

在自己的业务页面中引入路由模块，并调用对应页面：

```javascript
import Router from '@system.router';

openInput() {
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
```

目标页面的 `data` 中需要包含 `content` 字段：

```javascript
data: {
    content: ''
}
```

### 5. 构建并运行

完成文件复制、页面注册和路由调用后，重新构建项目并安装到 LiteWearable 设备。启动后可以先输入拼音，确认候选词能够显示；再测试完成、取消、删除和换行按钮。

## 注意事项

- 字典目录必须完整复制，缺少任意索引或数据文件都可能导致候选词无法查询。
- `targetPage` 和 `targetKey` 是键盘正常返回结果所必需的参数。
- `targetKey` 必须是目标页面已有的 `data` 字段名。
- `forbidden` 使用普通字符串匹配，不支持正则表达式。
- `maxLen` 为 `0` 时不限制输入长度，中文输入建议根据实际业务设置合适的上限。
- 键盘页面会在应用内部保存 `shear.json` 和 `pyref.json`，分别用于剪切板记录和候选词偏好。
- 资源路径区分目录层级，复制文件时不要只复制图片而遗漏 `lookupDictV5.js`。

## License

本项目基于 MIT License 开源。详见 [LICENSE](LICENSE)。
