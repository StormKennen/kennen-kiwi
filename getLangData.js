"use strict";
/**
 * @author doubledream
 * @desc 获取语言文件
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const utils_1 = require("./utils");
const CONFIG = utils_1.getProjectConfig();
// const globby = require("globby");
// const I18N_GLOB = `${LANG_DIR}/**/*.ts`;
/**
 * 获取对应文件的语言
 */
function getLangData(fileName) {
    if (fs.existsSync(fileName)) {
        return getLangJson(fileName);
    }
    else {
        return {};
    }
}
exports.getLangData = getLangData;
/**
 * 获取文件 Json
 */
function getLangJson(fileName) {
    const fileContent = fs.readFileSync(fileName, { encoding: 'utf8' });
    let obj = fileContent.match(/export\s*default\s*({[\s\S]+);?$/)[1];
    obj = obj.replace(/\s*;\s*$/, '');
    let jsObj = {};
    try {
        jsObj = eval('(' + obj + ')');
    }
    catch (err) {
        console.log(obj);
        console.error(err);
    }
    return jsObj;
}
function getI18N() {
    const langObj = getLangData(path.resolve(utils_1.getProjectConfigExtract().input));
    return langObj;
}
/**
 * 获取全部语言, 展平
 */
function getSuggestLangObj() {
    let langObj = getI18N();
    let finalLangObj = utils_1.flatten(langObj);
    return finalLangObj;
}
exports.getSuggestLangObj = getSuggestLangObj;
//# sourceMappingURL=getLangData.js.map