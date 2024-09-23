// esbuild.config.js
import { build } from 'esbuild';
import fs from 'fs/promises';
import path from 'path';

// dist 폴더를 정리하는 함수
async function cleanDistFolder() {
  try {
    await fs.rm('dist', { recursive: true, force: true });
    await fs.mkdir('dist');
  } catch (err) {
    console.error('Error cleaning dist folder:', err);
  }
}

// static 파일을 dist 폴더로 복사하는 함수
async function copyStaticFiles() {
  try {
    // src/ui.html에서 dist/ui.html로 복사
    await fs.copyFile('src/ui.html', 'dist/ui.html');
    // manifest.json 복사 제거
    // await fs.copyFile('manifest.json', 'dist/manifest.json');
  } catch (err) {
    console.error('Error copying static files:', err);
  }
}

// 빌드 함수
async function buildProject() {
  try {
    // dist 폴더를 정리
    await cleanDistFolder();

    // esbuild 실행 (ui.html을 인라인으로 포함시키지 않음)
    await build({
      entryPoints: ['src/code.ts'],
      bundle: true,
      outfile: 'dist/code.js',
      format: 'iife',
      loader: { 
        '.png': 'dataurl', 
        '.jpg': 'dataurl', 
        '.jpeg': 'dataurl', 
        '.gif': 'dataurl', 
        '.svg': 'dataurl',
        // '.html': 'text', // HTML 로더 제거
      },
      // plugins: [htmlPlugin], // HTML 플러그인 제거
      sourcemap: true, // 소스맵 활성화
      logLevel: 'info', // 로그 레벨 설정
    });

    // static 파일 복사 (src/ui.html만)
    await copyStaticFiles();

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// 빌드 실행
buildProject();