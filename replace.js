"use strict";
/**
 * @author doubledream
 * @desc 更新文件
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const _ = require("lodash");
const path = require("path");
const prettier = require("prettier");
const ts = require("typescript");
const file_1 = require("./file");
const getLangData_1 = require("./getLangData");
const utils_1 = require("./utils");
const CONFIG = utils_1.getProjectConfig();
const srcLangDir = './';
function updateLangFiles(keyValue, text, validateDuplicate) {
    let fullKey = keyValue;
    const targetFilename = path.resolve(utils_1.getProjectConfigExtract().output);
    if (!fs.existsSync(targetFilename)) {
        fs.writeFileSync(targetFilename, generateNewLangFile(fullKey, text));
        // addImportToMainLangFile(filename);
        utils_1.successInfo(`成功新建语言文件 ${targetFilename}`);
    }
    else {
        // 清除 require 缓存，解决手动更新语言文件后再自动抽取，导致之前更新失效的问题
        const mainContent = getLangData_1.getLangData(targetFilename);
        const obj = mainContent;
        if (Object.keys(obj).length === 0) {
            utils_1.failInfo(`${filename} 解析失败，该文件包含的文案无法自动补全`);
        }
        if (validateDuplicate && _.get(obj, fullKey) !== undefined) {
            utils_1.failInfo(`${targetFilename} 中已存在 key 为 \`${fullKey}\` 的翻译，请重新命名变量`);
            throw new Error('duplicate');
        }
        // \n 会被自动转义成 \\n，这里转回来
        text = text.replace(/\\n/gm, '\n');
        _.set(obj, fullKey, text);
        fs.writeFileSync(targetFilename, prettierFile(`export default ${JSON.stringify(obj, null, 2)}`));
    }
}
/**
 * 使用 Prettier 格式化文件
 * @param fileContent
 */
function prettierFile(fileContent) {
    try {
        return prettier.format(fileContent, {
            parser: 'typescript',
            trailingComma: 'all',
            singleQuote: true
        });
    }
    catch (e) {
        utils_1.failInfo(`代码格式化报错！${e.toString()}\n代码为：${fileContent}`);
        return fileContent;
    }
}
function generateNewLangFile(key, value) {
    const obj = _.set({}, key, value);
    return prettierFile(`export default ${JSON.stringify(obj, null, 2)}`);
}
function addImportToMainLangFile(newFilename) {
    let mainContent = '';
    if (fs.existsSync(`${srcLangDir}/index.ts`)) {
        mainContent = fs.readFileSync(`${srcLangDir}/index.ts`, 'utf8');
        mainContent = mainContent.replace(/^(\s*import.*?;)$/m, `$1\nimport ${newFilename} from './${newFilename}';`);
        if (/(}\);)/.test(mainContent)) {
            if (/\,\n(}\);)/.test(mainContent)) {
                /** 最后一行包含,号 */
                mainContent = mainContent.replace(/(}\);)/, `  ${newFilename},\n$1`);
            }
            else {
                /** 最后一行不包含,号 */
                mainContent = mainContent.replace(/\n(}\);)/, `,\n  ${newFilename},\n$1`);
            }
        }
        // 兼容 export default { common };的写法
        if (/(};)/.test(mainContent)) {
            if (/\,\n(};)/.test(mainContent)) {
                /** 最后一行包含,号 */
                mainContent = mainContent.replace(/(};)/, `  ${newFilename},\n$1`);
            }
            else {
                /** 最后一行不包含,号 */
                mainContent = mainContent.replace(/\n(};)/, `,\n  ${newFilename},\n$1`);
            }
        }
    }
    else {
        mainContent = `import ${newFilename} from './${newFilename}';\n\nexport default Object.assign({}, {\n  ${newFilename},\n});`;
    }
    fs.writeFileSync(`${srcLangDir}/index.ts`, mainContent);
}
/**
 * 检查是否添加 import I18N 命令
 * @param filePath 文件路径
 */
function hasImportI18N(filePath) {
    const code = file_1.readFile(filePath);
    return code.indexOf(CONFIG.checkImportI18N) > -1
}
exports.hasImportI18N = hasImportI18N;
/**
 * 在合适的位置添加 import I18N 语句
 * @param filePath 文件路径
 */
function createImportI18N(filePath) {
    const code = file_1.readFile(filePath);
    const ast = ts.createSourceFile('', code, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TSX);
    const isJsFile = _.endsWith(filePath, '.js');
    const isTsFile = _.endsWith(filePath, '.ts');
    const isTsxFile = _.endsWith(filePath, '.tsx');
    const isVueFile = _.endsWith(filePath, '.vue');
    if (isJsFile || isTsFile || isTsxFile) {
        const importStatement = `${CONFIG.importI18N}\n`;
        const pos = ast.getStart(ast, false);
        const updateCode = code.slice(0, pos) + importStatement + code.slice(pos);
        return updateCode;
    }
    else if (isVueFile) {
        const importStatement = `${CONFIG.importI18N}\n`;
        const updateCode = code.replace(/<script>/g, `<script>\n${importStatement}`);
        return updateCode;
    }
}
exports.createImportI18N = createImportI18N;
/**
 * 更新文件
 * @param filePath 当前文件路径
 * @param arg  目标字符串对象
 * @param val  目标 key
 * @param validateDuplicate 是否校验文件中已经存在要写入的 key
 * @param needWrite 是否只需要替换不需要更新 langs 文件
 * @param obj 源数据
 */
function replaceAndUpdate(filePath, arg, val, validateDuplicate, needWrite = true, obj) {
    const code = file_1.readFile(filePath);
    const isHtmlFile = _.endsWith(filePath, '.html');
    const isVueFile = _.endsWith(filePath, '.vue');
    let newCode = code;
    let finalReplaceText = arg.text;
    const { start, end } = arg.range;
    // 若是字符串，删掉两侧的引号
    if (arg.isString) {
        // 如果引号左侧是 等号，则可能是 jsx 的 props，此时要替换成 {
        const preTextStart = start - 1;
        const [last2Char, last1Char] = code.slice(preTextStart, start + 1).split('');
        let finalReplaceVal = CONFIG.formatReplaceKey(val, obj);
        if (last2Char === '=') {
            if (isHtmlFile) {
                finalReplaceVal = '{{' + CONFIG.formatReplaceKey(val, obj) + '}}';
            }
            else if (isVueFile) {
                finalReplaceVal = '{{' + CONFIG.formatReplaceKey(val, obj) + '}}';
            }
            else {
                finalReplaceVal = '{' + CONFIG.formatReplaceKey(val, obj) + '}';
            }
        }
        // 若是模板字符串，看看其中是否包含变量
        if (last1Char === '`') {
            const varInStr = arg.text.match(/(\$\{[^\}]+?\})/g);
            if (varInStr) {
                const kvPair = varInStr.map((str, index) => {
                    return `val${index + 1}: ${str.replace(/^\${([^\}]+)\}$/, '$1')}`;
                });
                finalReplaceVal = `${CONFIG.I18NTemplate}('${val}', { ${kvPair.join(',\n')} })`;
                varInStr.forEach((str, index) => {
                    finalReplaceText = finalReplaceText.replace(str, `{val${index + 1}}`);
                });
            }
        }
        newCode = `${code.slice(0, start)}${finalReplaceVal}${code.slice(end)}`;
        if (arg.inVueTemplate) {
            if (arg.isObjectProperty) {
                const codeStart = code.slice(0, start);
                const mat = codeStart.match(/\s+(\w+=")$/);
                if (mat) {
                    const codeStartLen = codeStart.length;
                    let keyword = mat?.[1];
                    let objectPropertyIndex = codeStart.search(new RegExp(`${keyword}$`));
                    newCode = `${codeStart.slice(0, objectPropertyIndex)}:${codeStart.slice(objectPropertyIndex, codeStartLen)}${finalReplaceVal}${code.slice(end)}`;
                }
            }
        }
    }
    else {
        if (isHtmlFile || isVueFile) {
            newCode = `${code.slice(0, start)}{{${CONFIG.formatReplaceKey(val, obj)}}}${code.slice(end)}`;
        }
        else {
            newCode = `${code.slice(0, start)}{${CONFIG.formatReplaceKey(val, obj)}}${code.slice(end)}`;
        }
    }
    try {
        if (needWrite) {
            // 更新语言文件
            updateLangFiles(val, finalReplaceText, validateDuplicate);
        }
        // 若更新成功再替换代码
        return file_1.writeFile(filePath, newCode);
    }
    catch (e) {
        return Promise.reject(e.message);
    }
}
exports.replaceAndUpdate = replaceAndUpdate;
//# sourceMappingURL=replace.js.map