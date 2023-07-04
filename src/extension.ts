'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ExtensionContext, workspace, window, commands } from 'vscode';
import { paramCase, pascalCase, camelCase } from 'change-case';
import { Observable } from 'rxjs';
import * as fs from 'fs';
import { FileHelper, logger } from './helpers';
// import { Config as ConfigInterface } from './config.interface';

// const TEMPLATE_SUFFIX_SEPERATOR = '-';

interface ICMD {
  commandId: string;
  prefix: string;
  suffix: string;
}

//激活扩展时调用此方法
//您的扩展在第一次执行命令时即被激活
export function activate(context: ExtensionContext) {
  const createComponent = (uri: string, cmd: ICMD) => {
    // Display a dialog to the user
    let enterComponentNameDialog$ = Observable.from(window.showInputBox({ prompt: '请为组件输入名称' }));

    const isTaroPage = cmd.commandId === 'extension.genTaroStatelessPageFiles' || cmd.commandId === 'extension.genTaroClassPageFiles';

    enterComponentNameDialog$
      .concatMap((val) => {
        if (val.length === 0) {
          logger('error', '组件名称不能为空！');
          throw new Error('组件名称不能为空！');
        }
        let componentName = paramCase(val);
        // let componentDir = FileHelper.createComponentDir(uri, componentName);
        let componentDir = '';
        if (cmd.prefix === 'page') {
          // 页面目录小驼峰
          componentDir = FileHelper.createComponentDir(uri, camelCase(componentName));
        } else {
          // 组件目录大驼峰
          componentDir = FileHelper.createComponentDir(uri, pascalCase(componentName));
        }
        console.log('componentDir::', componentDir);

        const appConfigReg = componentDir.match(/[\w\W]*src\//);
        // console.log("appConfigReg:", appConfigReg)

        if (isTaroPage && appConfigReg) {
          const tsFile = 'app.config.ts';
          const jsFile = 'app.config.js';
          let configFile = '';
          const appConfigFileDir = appConfigReg[0];
          const isTs = fs.existsSync(appConfigFileDir + tsFile);
          const isJs = fs.existsSync(appConfigFileDir + jsFile);
          if (isTs) {
            console.log('使用' + tsFile);
            configFile = appConfigFileDir + tsFile;
          } else if (isJs) {
            console.log('使用' + jsFile);
            configFile = appConfigFileDir + jsFile;
          } else {
            console.log('app.config不存在');
            throw new Error('找不到src/app.config文件');
          }
          return Observable.forkJoin(
            FileHelper.updateAppConfig(componentDir, componentName, configFile),
            FileHelper.createComponent(componentDir, componentName, cmd.prefix, cmd.suffix),
            FileHelper.createIndexFile(componentDir, componentName),
            FileHelper.createCSS(componentDir, componentName),
            FileHelper.createPageConfig(componentDir, componentName)
          );
        }

        return Observable.forkJoin(
          Observable.of(''),
          FileHelper.createComponent(componentDir, componentName, cmd.prefix, cmd.suffix),
          FileHelper.createIndexFile(componentDir, componentName),
          FileHelper.createCSS(componentDir, componentName),
          Observable.of('')
        );
      })
      .concatMap((result) => Observable.from(result))
      .filter((path) => path.length > 0)
      .first()
      .concatMap((filename) => Observable.from(workspace.openTextDocument(filename)))
      .concatMap((textDocument) => {
        if (!textDocument) {
          logger('error', '无法打开文件！');
          throw new Error('无法打开文件！');
        }
        return Observable.from(window.showTextDocument(textDocument));
      })
      .do((editor) => {
        if (!editor) {
          logger('error', '无法打开文件！');
          throw new Error('无法打开文件！');
        }
      })
      .subscribe(
        (c) => logger('success', 'React component successfully created!'),
        (err) => logger('error', err.message)
      );
  };

  const componentArray = [
    {
      prefix: 'component',
      suffix: 'container',
      commandId: 'extension.genReactContainerComponentFiles',
    },
    {
      prefix: 'component',
      suffix: 'stateless',
      commandId: 'extension.genReactStatelessComponentFiles',
    },
    {
      prefix: 'component',
      suffix: 'reduxContainer',
      commandId: 'extension.genReactReduxContainerComponentFiles',
    },
    {
      prefix: 'component',
      suffix: 'reduxStateless',
      commandId: 'extension.genReactReduxStatelessComponentFiles',
    },
    {
      prefix: 'page',
      suffix: 'taroClass',
      commandId: 'extension.genTaroClassPageFiles',
    },
    {
      prefix: 'page',
      suffix: 'taroStateless',
      commandId: 'extension.genTaroStatelessPageFiles',
    },
    {
      prefix: 'component',
      suffix: 'taroStateless',
      commandId: 'extension.genTaroStatelessComponentFiles',
    },
    {
      prefix: 'page',
      suffix: 'nextjsStateless',
      commandId: 'extension.genNextjsStatelessPageFiles',
    },
    {
      prefix: 'component',
      suffix: 'nextjsStateless',
      commandId: 'extension.genNextjsStatelessComponentFiles',
    },
    {
      prefix: 'page',
      suffix: 'antproStateless',
      commandId: 'extension.genAntproStatelessPageFiles',
    },
  ];

  // 该命令已在package.json文件中定义
  // 现在用 registerCommand 提供命令的实现
  // commandId 参数必须与 package.json中的命令字段匹配
  componentArray.forEach((command) => {
    const disposable = commands.registerCommand(command.commandId, (uri) => createComponent(uri, command));

    // Add to a list of disposables which are disposed when this extension is deactivated.
    //添加到停用此扩展时处理的一次性物品列表中。
    context.subscriptions.push(disposable);
  });
}

// // 当您的扩展被停用时，将调用此方法
export function deactivate() {
  // code whe
}
