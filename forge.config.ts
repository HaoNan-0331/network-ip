import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';

// 获取模块的所有依赖（递归）
function getAllDependencies(modName: string, nodeModulesPath: string, collected: Set<string>): void {
  if (collected.has(modName)) return;
  collected.add(modName);

  const modPath = path.join(nodeModulesPath, modName);
  const pkgPath = path.join(modPath, 'package.json');

  if (!fs.existsSync(pkgPath)) return;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.optionalDependencies };

    for (const dep of Object.keys(deps || {})) {
      // 跳过electron本身
      if (dep === 'electron') continue;
      getAllDependencies(dep, nodeModulesPath, collected);
    }
  } catch (e) {
    // 忽略解析错误
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: false,
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ['win32', 'darwin']),
    new MakerSquirrel({}),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
  hooks: {
    postPackage: async (forgeConfig, options) => {
      const appPath = path.join(options.outputPaths[0], 'resources', 'app');
      const nodeModulesPath = path.join(appPath, 'node_modules');
      const srcNodeModules = path.join(process.cwd(), 'node_modules');

      console.log('Analyzing production dependencies...');

      // 读取package.json的dependencies
      const pkg = require('./package.json');
      const directDeps = Object.keys(pkg.dependencies || {});

      // 收集所有需要的模块（包括子依赖）
      const allDeps = new Set<string>();
      for (const dep of directDeps) {
        if (dep !== 'electron') {
          getAllDependencies(dep, srcNodeModules, allDeps);
        }
      }

      console.log(`Found ${allDeps.size} modules to copy`);

      // 确保目标目录存在
      await fs.promises.mkdir(nodeModulesPath, { recursive: true });

      // 复制模块
      let copied = 0;
      for (const mod of allDeps) {
        const srcPath = path.join(srcNodeModules, mod);
        const destPath = path.join(nodeModulesPath, mod);

        if (fs.existsSync(srcPath)) {
          await fsExtra.copy(srcPath, destPath, {
            overwrite: true,
            filter: (src: string) => {
              const basename = path.basename(src);
              // 排除不需要的文件
              if (basename.startsWith('.')) return false;
              if (['test', 'tests', '__tests__', 'example', 'examples', 'doc', 'docs', '.bin'].includes(basename)) return false;
              return true;
            }
          });
          copied++;
          if (copied % 50 === 0) {
            console.log(`Copied ${copied}/${allDeps.size} modules...`);
          }
        }
      }

      console.log(`Successfully copied ${copied} production dependencies`);
    },
  },
};

export default config;
