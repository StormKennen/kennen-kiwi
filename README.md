#kennen-lang

## 安装
### npm install

## 如何使用
```shell script
# 1.进入src目录
cd src

# 2.执行node，path枚举：daas、dfs、绝对路径（多个路径用,隔开）
node index.js --extract [path]

# 举例，比如只处理daas项目，需要项目的根目录平级，不然无法使用
node index.js --extract daas

# 举例，比如指定文件或者目录
node index.js --extract D:\coding\test
```
## 配置文件说明
```shell script
# utils.js文件的变量configObj
let configObj = {
  // 这里不使用翻译API,因为容易断线
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
  // 导出中文文案的文件地址;input是会读取内容后再替换,避免创建重复内容的国际化
  extract: {
    default: {
      input: "..\\..\\tapdata-web\\apps\\daas\\src\\i18n\\langs\\zh-CN.js",
      output: "..\\..\\tapdata-web\\apps\\daas\\src\\i18n\\langs\\zh-CN.js"
    },
    // daas目录的路径,如果不是平级,也可以写绝对路径
    daas: {
      input: "..\\..\\tapdata-web\\apps\\daas\\src\\i18n\\langs\\zh-CN.js",
      output: "..\\..\\tapdata-web\\apps\\daas\\src\\i18n\\langs\\zh-CN.js"
    },
    // dfs目录的路径,如果不是平级,也可以写绝对路径
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
  // 指定处理的目录,可以是绝对路径
  src: "..\\..\\tapdata-web\\apps"
};
```

