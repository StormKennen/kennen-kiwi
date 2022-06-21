/**
 * @author linhuiw
 * @desc 工具方法
 */
const pinyin_pro_1 = require("pinyin-pro");
const colors = require("colors");
const _ = require("lodash");
const {value} = require("lodash/seq");
let extractEnv = "";
let configObj = {
  // 这里不使用翻译API，因为容易断线
  defaultTranslateKeyApi: "Pinyin",
  // 引入国际化
  importI18N: `import i18n from '@/i18n'`,
  // 国际化的模板格式
  I18NTemplate: "i18n.t",
  // 检查是否已引入国际化
  checkImportI18N: `'@/i18n'`,
  // 忽略的目录
  ignoreDir: ".idea,i18n,mock,node_modules,public",
  // 忽略的文件
  ignoreFile: "VSelect.vue,VIcon.vue,const.js",
  // 提取的国际化key的拼接符
  suggestionJoin: "_",
  // 导出中文文案的文件地址；input是会读取内容后再替换，避免创建重复内容的国际化
  extract: {
    default: {
      input: "..\\..\\tapdata-web\\apps\\daas\\src\\i18n\\langs\\zh-CN.js",
      output: "..\\..\\tapdata-web\\apps\\daas\\src\\i18n\\langs\\zh-CN.js"
    },
    // daas目录的路径，如果不是平级，也可以写绝对路径
    daas: {
      input: "..\\..\\tapdata-web\\apps\\daas\\src\\i18n\\langs\\zh-CN.js",
      output: "..\\..\\tapdata-web\\apps\\daas\\src\\i18n\\langs\\zh-CN.js"
    },
    // dfs目录的路径，如果不是平级，也可以写绝对路径
    dfs: {
      input: "..\\..\\tapdata-web\\apps\\dfs\\src\\i18n\\langs\\zh-CN.js",
      output: "..\\..\\tapdata-web\\apps\\dfs\\src\\i18n\\langs\\zh-CN.js"
    }
  },
  // 这里是替换到文件中的格式
  formatReplaceKey: function (key, item) {
    if (item.target.inVueTemplate) {
      return `$t('${key}')`;
    }
    return `i18n.t('${key}')`;
  },
  // 指定处理的目录，可以是绝对路径
  src: "..\\..\\tapdata-web\\apps"
};
let replaceObj = {
  vue: {
    template: [],
    js: []
  }
}
/**
 * 翻译中文
 */
function translateKeyText(text, origin) {
  const result = pinyin_pro_1.pinyin(text, { toneType: "none" });
  return result.replace(/\s+/g, "").split("$");
}
exports.translateKeyText = translateKeyText;
/**
 * 将对象拍平
 * @param obj 原始对象
 * @param prefix
 */
function flatten(obj, prefix = "") {
  var propName = prefix ? prefix + "." : "",
    ret = {};
  for (var attr in obj) {
    if (_.isArray(obj[attr])) {
      var len = obj[attr].length;
      ret[attr] = obj[attr].join(",");
    } else if (typeof obj[attr] === "object") {
      _.extend(ret, flatten(obj[attr], propName + attr));
    } else {
      ret[propName + attr] = obj[attr];
    }
  }
  return ret;
}
exports.flatten = flatten;
function findMatchKey(langObj, text) {
  for (const key in langObj) {
    if (langObj[key] === text) {
      return key;
    }
  }
  return null;
}
exports.findMatchKey = findMatchKey;
function findMatchValue(langObj, key) {
  return langObj[key];
}
exports.findMatchValue = findMatchValue;
/**
 * 成功的提示
 */
function successInfo(message) {
  console.log(colors.green(message));
}
exports.successInfo = successInfo;
/**
 * 失败的提示
 */
function failInfo(message) {
  console.log(colors.red(message));
}
exports.failInfo = failInfo;
/**
 * 普通提示
 */
function highlightText(message) {
  return colors.yellow(`${message}`);
}
exports.highlightText = highlightText;
/**
 * 获得项目配置信息
 */
function getProjectConfig() {
  // const configFile = path.resolve(process.cwd(), `./${const_1.KIWI_CONFIG_FILE}`);
  // let obj = const_1.PROJECT_CONFIG.defaultConfig;
  // if (configFile && fs.existsSync(configFile)) {
  //     obj = Object.assign({}, obj, JSON.parse(fs.readFileSync(configFile, 'utf8')));
  // }
  return configObj;
}
exports.getProjectConfig = getProjectConfig;

function setProjectConfigExtract(env) {
  if (["daas", "dfs"].includes(env)) {
    extractEnv = env;
  } else {
    extractEnv = "";
  }
}
exports.setProjectConfigExtract = setProjectConfigExtract;

function getProjectConfigExtract() {
  if (extractEnv) {
    return configObj.extract[extractEnv];
  }
  return configObj.extract.default;
}
exports.getProjectConfigExtract = getProjectConfigExtract;

function setReplaceObj(key, val) {
  replaceObj[key] = val;
}
exports.setReplaceObj = setReplaceObj;

function getReplaceObj(key) {
  return replaceObj[key];
}
exports.getReplaceObj = getReplaceObj;
//# sourceMappingURL=utils.js.map
