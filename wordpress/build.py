#!/usr/bin/env python3
"""Сборка WordPress-плагина «Вентшахты: лендинги» из HTML-версий страниц.

Источник правды — index.html, remont.html и assets/ в корне репозитория.
Скрипт:
  1. копирует assets/ (стили, скрипт, фото) в плагин;
  2. превращает каждую HTML-страницу в PHP-шаблон: пути к файлам ведут
     в папку плагина, ссылки между лендингами берутся из настроек,
     <head> отдаётся WordPress (wp_head), скрипт подключает плагин;
  3. упаковывает плагин в wordpress/dist/ventshaty-landings.zip.

Запуск из корня репозитория:  python3 wordpress/build.py
"""
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLUGIN = ROOT / 'wordpress' / 'ventshaty-landings'
DIST = ROOT / 'wordpress' / 'dist'

# HTML-страница → файл шаблона в плагине
PAGES = {
    'remont.html': 'remont.php',
    'index.html': 'gazifikaciya.php',
}

# Ссылки между лендингами → опция плагина
PAGE_LINKS = {
    'index.html': "<?php echo esc_url( vsh_opt( 'montazh_url' ) ); ?>",
}

ASSET = "<?php echo $vsh_u; ?>assets/"


def fix_url(value):
    if value in PAGE_LINKS:
        return PAGE_LINKS[value]
    # одиночный путь и каждый пункт srcset вида «assets/… 640w, assets/… 960w»
    return re.sub(r'(^|,\s*)assets/', lambda m: m.group(1) + ASSET, value)


def build_template(html, name):
    title = re.search(r'<title>(.*?)</title>', html, re.S).group(1).strip()
    desc = re.search(r'<meta name="description" content="([^"]*)"', html).group(1)
    body = re.search(r'<body>\n?(.*)</body>', html, re.S).group(1)

    # скрипт подключает плагин (wp_enqueue_script), в разметке он не нужен
    body, n = re.subn(r'\s*<script src="assets/main\.js" defer></script>\s*', '\n', body)
    if n != 1:
        sys.exit(f'{name}: не найден <script src="assets/main.js">')

    body = re.sub(
        r'(\s(?:src|href|srcset)=")([^"]*)(")',
        lambda m: m.group(1) + fix_url(m.group(2)) + m.group(3),
        body,
    )

    # проверки: не осталось относительных путей, нет случайного PHP в разметке
    leftovers = re.findall(r'(?:src|href|srcset)="(?!https?:|tel:|mailto:|#|<\?php)([^"]+)"', body)
    if leftovers:
        sys.exit(f'{name}: остались относительные ссылки: {leftovers}')
    if '<?' in re.sub(r'<\?php echo [^?]*\?>', '', body):
        sys.exit(f'{name}: в разметке встретилось «<?»')

    php_str = lambda s: "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"
    return (
        "<?php\n"
        "/**\n"
        f" * Шаблон собран wordpress/build.py из {name} — не правьте вручную,\n"
        " * меняйте HTML в корне репозитория и пересоберите плагин.\n"
        " */\n"
        "defined( 'ABSPATH' ) || exit;\n"
        "$vsh_u = esc_url( VSH_URL );\n"
        "?><!DOCTYPE html>\n"
        "<html <?php language_attributes(); ?>>\n"
        "<head>\n"
        '<meta charset="<?php bloginfo( \'charset\' ); ?>">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"<?php vsh_head_meta( {php_str(title)}, {php_str(desc)} ); ?>\n"
        "<?php wp_head(); ?>\n"
        "</head>\n"
        "<body <?php body_class( 'vsh-landing' ); ?>>\n"
        "<?php wp_body_open(); ?>\n"
        f"{body.rstrip()}\n\n"
        "<?php wp_footer(); ?>\n"
        "</body>\n"
        "</html>\n"
    )


def main():
    # 1. assets
    target = PLUGIN / 'assets'
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(ROOT / 'assets', target)

    # 2. шаблоны
    (PLUGIN / 'templates').mkdir(parents=True, exist_ok=True)
    for src, dst in PAGES.items():
        html = (ROOT / src).read_text(encoding='utf-8')
        (PLUGIN / 'templates' / dst).write_text(build_template(html, src), encoding='utf-8')
        print(f'{src} -> templates/{dst}')

    # 3. zip: внутри одна папка ventshaty-landings/, как ждёт WordPress
    DIST.mkdir(parents=True, exist_ok=True)
    archive = DIST / 'ventshaty-landings.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(PLUGIN.rglob('*')):
            if path.is_file():
                z.write(path, Path('ventshaty-landings') / path.relative_to(PLUGIN))
    print(f'{archive.relative_to(ROOT)} ({archive.stat().st_size // 1024} КБ)')


if __name__ == '__main__':
    main()
