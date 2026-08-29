import File from '@system.file';

const _this = {
  lookupDict: lookupDict,
};

const SEP_ENTRY = "\u001e";
const SEP_OFFLEN = "\u001f";

function from94(str) {
  const CHAR_START = 33;
  const BASE = 94;
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    result = result * BASE + (str.charCodeAt(i) - CHAR_START);
  }
  return result;
}

/**
 * @param baseDir 字典目录
 * @param key 查找的字符串
 * @param then 回调 (match, key, result)
 */
function lookupDict(baseDir, key, then) {
  const searchKey = key.toLowerCase();
  let depth = 0;

  // 记录最长前缀匹配
  let bestMatch = { key: "", off: -1, len: -1, depth: -1 };

  function step(readOff, readLen) {
    File.readText({
      uri: baseDir + "/key" + depth + ".dat",
      position: readOff,
      length: readLen,

      fail: (data, code) => {
        if (bestMatch.off !== -1) {
          readValue(bestMatch.off, bestMatch.len, bestMatch.depth, function (v) {
            then(bestMatch.key, v);
          });
        } else {
          then("", null);
        }
      },

      success: d => {
        const text = d.text;
        const entries = text.split(SEP_ENTRY);
        const targetChar = searchKey[depth];

        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          if (!entry) continue;

          const char = entry[0];
          const parts = entry.substring(1).split(SEP_OFFLEN);
          const vOff = from94(parts[0]);
          const vLen = from94(parts[1]);

          // 处理当前节点的叶子数据 (前缀匹配)
          if (char === "_") {
            bestMatch.key = searchKey.substring(0, depth);
            bestMatch.off = vOff;
            bestMatch.len = vLen;
            bestMatch.depth = depth;
          }

          // 处理通往下一层的路径
          if (char === targetChar) {
            if (depth === searchKey.length) {
              // 精确匹配结束
              break;
            }
            depth++;
            return setTimeout(() => step(vOff, vLen), 0);
          }
        }

        // 没有找到下一层，返回最长匹配
        if (bestMatch.off !== -1) {
          readValue(bestMatch.off, bestMatch.len, bestMatch.depth, function (v) {
            then(bestMatch.key, v);
          });
        } else {
          then("", null);
        }
      }
    });
  }

  function readValue(vPos, vLen, vDepth, callback) {
    File.readText({
      uri: baseDir + "/value" + vDepth + ".dat",
      position: vPos,
      length: vLen,
      fail: function () { callback(null); },
      success: function (data) { callback(data.text); }
    });
  }

  step(0, 1024);
}

export default _this;