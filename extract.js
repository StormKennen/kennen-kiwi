const _ = require("lodash");
const path = require("path");
const slash = require("slash2");
const simpleGit = require("simple-git");
const file_1 = require("./file");
const findChineseText_1 = require("./findChineseText");
const utils_1 = require("./utils");
const replace_1 = require("./replace");
const getLangData_1 = require("./getLangData");
const CONFIG = utils_1.getProjectConfig();

var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : new P(function (resolve) {
              resolve(result.value);
            }).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
/**
 * @param currentFilename 文件路径
 * @returns string[]
 */
function getSuggestion(currentFilename) {
  let suggestion = [];
  const suggestPageRegex = /\/pages\/\w+\/([^\/]+)\/([^\/\.]+)/;
  if (currentFilename.includes("/pages/")) {
    suggestion = currentFilename.match(suggestPageRegex);
  }
  if (suggestion) {
    suggestion.shift();
  }
  /** 如果没有匹配到 Key */
  if (!(suggestion && suggestion.length)) {
    const names = slash(currentFilename).split("/");
    const fileName = _.last(names);
    const fileKey = fileName.split(".")[0].replace(new RegExp("-", "g"), "_");
    const dir = names[names.length - 2].replace(new RegExp("-", "g"), "_");
    if (dir === fileKey) {
      suggestion = [dir];
    } else {
      suggestion = [dir, fileKey];
    }
  }
  return suggestion;
}
/**
 * 处理作为key值的翻译原文
 */
function getTransOriginText(text) {
  // 避免翻译的字符里包含数字或者特殊字符等情况，只过滤出汉字和字母
  const reg = /[a-zA-Z\u4e00-\u9fa5]+/g;
  const findText = text.match(reg) || [];
  const transOriginText = findText ? findText.join("").slice(0, 5) : "中文符号";
  return transOriginText;
}
/**
 * 递归匹配项目中所有的代码的中文
 */
function findAllChineseText(dir) {
  if (!dir) {
    return [];
  }
  const first = dir.split(",")[0];
  let files = [];
  if (file_1.isDirectory(first)) {
    const dirPath = path.resolve(process.cwd(), dir);
    files = file_1.getSpecifiedFiles(
      dirPath,
      CONFIG.ignoreDir,
      CONFIG.ignoreFile
    );
  } else {
    const ignoreFileList = CONFIG.ignoreFile?.split(",") || [];
    const ignoreFileDir = CONFIG.ignoreDir?.split(",") || [];
    files = dir.split(",").filter((t) => {
      const basename = path.basename(t);
      const otherPath = t.replace(basename, "");
      return (
        !ignoreFileList.includes(path.basename(t)) &&
        !ignoreFileDir.some((i) => otherPath.includes(i))
      );
    });
  }
  const filterFiles = files.filter((file) => {
    return (
      (file_1.isFile(file) && file.endsWith(".ts")) ||
      file.endsWith(".tsx") ||
      file.endsWith(".js") ||
      file.endsWith(".vue")
    );
  });
  const allTexts = filterFiles.reduce((pre, file) => {
    const code = file_1.readFile(file);
    const texts = findChineseText_1.findChineseText(code, file);
    // 调整文案顺序，保证从后面的文案往前替换，避免位置更新导致替换出错
    const sortTexts = _.sortBy(texts, (obj) => -obj.range.start);
    if (texts.length > 0) {
      console.log(
        `${utils_1.highlightText(file)} 发现 ${utils_1.highlightText(
          texts.length
        )} 处中文文案`
      );
    }
    return texts.length > 0 ? pre.concat({ file, texts: sortTexts }) : pre;
  }, []);
  return allTexts;
}
/**
 * 统一处理key值，已提取过的文案直接替换，翻译后的key若相同，加上出现次数
 * @param currentFilename 文件路径
 * @param langsPrefix 替换后的前缀
 * @param translateTexts 翻译后的key值
 * @param targetStrs 当前文件提取后的文案
 * @returns any[] 最终可用于替换的key值和文案
 */
function getReplaceableStrs(
  currentFilename,
  langsPrefix,
  translateTexts,
  targetStrs
) {
  const finalLangObj = getLangData_1.getSuggestLangObj();
  const virtualMemory = {};
  const suggestion = getSuggestion(currentFilename);
  const isJsFile = currentFilename.endsWith(".js");
  const isTsFile = currentFilename.endsWith(".ts");
  const isTsxFile = currentFilename.endsWith(".tsx");
  const isVueFile = currentFilename.endsWith(".vue");
  const replaceableStrs = targetStrs.reduce((prev, curr, i) => {
    const key = utils_1.findMatchKey(finalLangObj, curr.text);
    if (!virtualMemory[curr.text]) {
      if (key) {
        virtualMemory[curr.text] = key;
        return prev.concat({
          target: curr,
          key,
          needWrite: false,
          isJsFile,
          isTsFile,
          isTsxFile,
          isVueFile,
        });
      }
      const transText = translateTexts[i] && _.camelCase(translateTexts[i]);
      // let transKey = `${suggestion.length ? suggestion.join('.') + '.' : ''}${transText}`;
      let transKey = `${
        suggestion.length
          ? suggestion.join(CONFIG.suggestionJoin).toLocaleLowerCase() +
            CONFIG.suggestionJoin
          : ""
      }${transText}`;
      if (langsPrefix) {
        // transKey = `${langsPrefix}.${transText}`;
        transKey = `${langsPrefix}${CONFIG.suggestionJoin}${transText}`;
      }
      let occurTime = 1;
      // 防止出现前四位相同但是整体文案不同的情况
      while (
        utils_1.findMatchValue(finalLangObj, transKey) !== curr.text &&
        _.keys(finalLangObj).includes(
          `${transKey}${occurTime >= 2 ? occurTime : ""}`
        )
      ) {
        occurTime++;
      }
      if (occurTime >= 2) {
        transKey = `${transKey}${occurTime}`;
      }
      virtualMemory[curr.text] = transKey;
      finalLangObj[transKey] = curr.text;
      return prev.concat({
        target: curr,
        key: transKey,
        needWrite: true,
        isJsFile,
        isTsFile,
        isTsxFile,
        isVueFile,
      });
    } else {
      return prev.concat({
        target: curr,
        key: virtualMemory[curr.text],
        needWrite: true,
        isJsFile,
        isTsFile,
        isTsxFile,
        isVueFile,
      });
    }
  }, []);
  return replaceableStrs;
}
/**
 * 递归匹配项目中所有的代码的中文
 * @param {dirPath} 文件夹路径
 */
function extractAll({ dirPath, prefix }) {
  // const dir = dirPath || "./";
  const dir = dirPath;
  // 去除I18N
  const langsPrefix = prefix ? prefix.replace(/^I18N\./, "") : null;
  // 翻译源配置错误，则终止
  const origin = CONFIG.defaultTranslateKeyApi || "Pinyin";
  const allTargetStrs = findAllChineseText(dir);
  if (allTargetStrs.length === 0) {
    console.log(utils_1.highlightText("没有发现可替换的文案！"));
    return;
  }
  console.log("即将截取每个中文文案的前5位翻译生成key值，并替换中...");
  // 对当前文件进行文案key生成和替换
  const generateKeyAndReplace = (item) =>
    __awaiter(this, void 0, void 0, function* () {
      const currentFilename = item.file;
      console.log(`${currentFilename} 替换中...`);
      // 过滤掉模板字符串内的中文，避免替换时出现异常
      const targetStrs = item.texts.reduce((pre, strObj, i) => {
        // 因为文案已经根据位置倒排，所以比较时只需要比较剩下的文案即可
        const afterStrs = item.texts.slice(i + 1);
        if (afterStrs.some((obj) => strObj.range.end <= obj.range.end)) {
          return pre;
        }
        return pre.concat(strObj);
      }, []);
      const len = item.texts.length - targetStrs.length;
      if (len > 0) {
        console.log(
          `存在 ${utils_1.highlightText(
            len
          )} 处文案无法替换，请避免在模板字符串的变量中嵌套中文`
        );
      }
      let translateTexts;
      if (origin !== "Google") {
        // 翻译中文文案，百度和pinyin将文案进行拼接统一翻译
        const delimiter = origin === "Baidu" ? "\n" : "$";
        const translateOriginTexts = targetStrs.reduce((prev, curr, i) => {
          const transOriginText = getTransOriginText(curr.text);
          if (i === 0) {
            return transOriginText;
          }
          return `${prev}${delimiter}${transOriginText}`;
        }, []);
        translateTexts = yield utils_1.translateKeyText(
          translateOriginTexts,
          origin
        );
      }
      if (translateTexts.length === 0) {
        utils_1.failInfo(`未得到翻译结果，${currentFilename}替换失败！`);
        return;
      }
      const replaceableStrs = getReplaceableStrs(
        currentFilename,
        langsPrefix,
        translateTexts,
        targetStrs
      );
      yield replaceableStrs
        .reduce((prev, obj) => {
          return prev.then(() => {
            return replace_1.replaceAndUpdate(
              currentFilename,
              obj.target,
              obj.key,
              // CONFIG.formatReplaceKey(obj.key, obj),
              false,
              obj.needWrite,
              obj
            );
          });
        }, Promise.resolve())
        .then(() => {
          // 添加 import I18N
          let getReplaceObjVue = utils_1.getReplaceObj('vue')
          if (!replace_1.hasImportI18N(currentFilename)) {
            const isVueFile = _.endsWith(currentFilename, '.vue');
            if ((isVueFile && getReplaceObjVue.js.includes(currentFilename)) || !isVueFile) {
              const code = replace_1.createImportI18N(currentFilename);
              file_1.writeFile(currentFilename, code);
            }
          }
          utils_1.successInfo(
            `${currentFilename} 替换完成，共替换 ${targetStrs.length} 处文案！`
          );
        })
        .catch((e) => {
          utils_1.failInfo(e);
        });
    });
  allTargetStrs
    .reduce((prev, current) => {
      return prev.then(() => {
        return generateKeyAndReplace(current);
      });
    }, Promise.resolve())
    .then(() => {
      utils_1.successInfo("全部替换完成！");
    });
}

async function run() {
  // 执行对应函数
  let argv = process.argv;
  let oper = argv[2] ? argv[2].replace("--", "") : "";
  let dir;
  const a3 = argv[3];
  let argvMapping = {
    extract: true, // 提取中文文案
    translate: true, // 翻译
    replace: true, // 兼容旧国际化
  };

  if (a3) {
    let options = {
      baseDir: path.resolve(CONFIG.src),
      binary: "git",
      // maxConcurrentProcesses: 6,
    };
    const git = simpleGit(options);
    let status = await git.status();
    let srcDir = path.resolve(CONFIG.src);
    let targetRoot = path.dirname(srcDir);
    if (a3 === "dfs") {
      let modified = status?.modified.filter(t => t.includes('dfs'));
      dir = modified.map(t => `${targetRoot}/${t}`)?.join() || "";
    } else if (a3 === "daas") {
      let modified = status?.modified.filter(t => t.includes('daas'));
      dir = modified.map(t => `${targetRoot}/${t}`)?.join() || "";
    } else {
      dir = a3;
    }
    utils_1.setProjectConfigExtract(a3);
  }
  dir = dir
    .split(",")
    .map((t) => path.resolve(t))
    .join();
  if (argvMapping[oper]) {
    switch (oper) {
      case "extract":
        extractAll({
          dirPath: dir,
        });
        // extractAllChineseFnc()
        break;
      case "replace":
        // replaceOldLangFnc()
        break;
      case "translate":
        // translateAllFnc()
        break;
      case "h":
      case "help":
        console.log(
          "导出中文文案：--extract [dir]  替换旧国际化: --replace   自动翻译:--translate"
        );
        break;
      default:
        break;
    }
  } else {
    console.log(`执行文件： node ./langScript.js  加上后面的命令：
  导出中文文案：--extract [dir]
  替换旧国际化: --replace
  自动翻译:--translate`);
    console.log(
      `例子-导出当前目录下的src文件，所有的中文文案：node ./langScript.js --extract src`
    );
  }
}
// run();
exports.run = run;