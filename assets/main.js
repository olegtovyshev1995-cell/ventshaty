/* ============================================================
   Вентшахты.рф — страница газификации
   1. Переключение объектов в галерее «обычно / наша работа»
   2. Открытие видео в модальном окне (когда ссылки заданы)
   Без JS страница остаётся читаемой: показан первый объект.
   ============================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------
     1. Галерея объектов
     Фото второго и третьего объекта клиент ещё не прислал —
     до этого момента в карточках стоят заглушки.
     -------------------------------------------------------- */

  var OBJECTS = [
    {
      usual: {
        base: 'assets/img/gas-usual',
        widths: [640, 960, 1080],
        width: 1080,
        height: 810,
        alt: 'Сэндвич-дымоход, выведенный снаружи по фасаду деревянного дома'
      },
      ours: {
        base: 'assets/img/gas-ours',
        widths: [640, 960, 1440],
        width: 1440,
        height: 1080,
        alt: 'Вентшахта в фальцевой обшивке с дымником на кровле кирпичного дома'
      }
    },
    { usual: null, ours: null },
    { usual: null, ours: null }
  ];

  var PLACEHOLDER_TEXT = {
    usual: 'Фото «как делают обычно» для этого объекта',
    ours: 'Фото «как делаем мы» для этого объекта'
  };

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab[data-object]'));
  var panel = document.getElementById('objpanel');

  if (tabs.length && panel) {
    var mediaBoxes = {
      usual: panel.querySelector('[data-media="usual"]'),
      ours: panel.querySelector('[data-media="ours"]')
    };
    var badges = {
      usual: mediaBoxes.usual && mediaBoxes.usual.querySelector('.media-badge'),
      ours: mediaBoxes.ours && mediaBoxes.ours.querySelector('.media-badge')
    };
    var current = 0;

    var photoMarkup = function (photo, kind) {
      if (!photo) {
        return '<div class="img-placeholder" data-placeholder="' + PLACEHOLDER_TEXT[kind] + '"></div>';
      }
      var srcset = photo.widths
        .map(function (w) { return photo.base + '-' + w + '.jpg ' + w + 'w'; })
        .join(', ');
      return '<picture>' +
        '<source type="image/jpeg" srcset="' + srcset + '" sizes="(max-width: 860px) 100vw, 600px">' +
        '<img src="' + photo.base + '-960.jpg" width="' + photo.width + '" height="' + photo.height +
        '" loading="lazy" decoding="async" alt="' + photo.alt + '">' +
        '</picture>';
    };

    var renderMedia = function (kind, photo) {
      var box = mediaBoxes[kind];
      if (!box) return;
      box.innerHTML = photoMarkup(photo, kind);
      if (badges[kind]) box.appendChild(badges[kind]);
    };

    var select = function (index, moveFocus) {
      if (index === current) return;
      current = index;

      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
      });

      panel.setAttribute('aria-labelledby', tabs[index].id);
      renderMedia('usual', OBJECTS[index].usual);
      renderMedia('ours', OBJECTS[index].ours);

      if (moveFocus) tabs[index].focus();
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i, false); });
    });

    // Стрелками между табами — как ожидается от роли tablist
    document.querySelector('.tabs').addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      select(next, true);
    });
  }

  /* --------------------------------------------------------
     2. Видео
     Пока у роликов нет ссылок — карточки статичные.
     Как только в VIDEO_URLS появится адрес (YouTube / VK / Rutube),
     соответствующая карточка начинает открывать плеер.
     -------------------------------------------------------- */

  var VIDEO_URLS = [
    null, // Как мы считаем шахту под ваш котёл
    null, // Стык с кровлей: почему не течёт
    null  // Готовый узел на доме
  ];

  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-video]'));
  var dialog = null;

  var closeDialog = function () {
    if (!dialog) return;
    dialog.querySelector('.video-modal-frame').src = 'about:blank';
    dialog.close();
  };

  var openDialog = function (url, title) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'video-modal';
      dialog.innerHTML =
        '<button type="button" class="video-modal-close">Закрыть</button>' +
        '<iframe class="video-modal-frame" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>';
      dialog.querySelector('.video-modal-close').addEventListener('click', closeDialog);
      dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });
      dialog.addEventListener('close', function () {
        dialog.querySelector('.video-modal-frame').src = 'about:blank';
      });
      document.body.appendChild(dialog);
    }
    var frame = dialog.querySelector('.video-modal-frame');
    frame.title = title;
    frame.src = url;
    dialog.showModal();
  };

  cards.forEach(function (card, i) {
    var url = VIDEO_URLS[i];
    if (!url) return;

    var media = card.querySelector('.video-media');
    var heading = card.querySelector('h3');
    var title = heading ? heading.textContent.trim() : 'Видео';

    card.classList.add('is-playable');
    media.setAttribute('role', 'button');
    media.setAttribute('tabindex', '0');
    media.setAttribute('aria-label', 'Смотреть видео: ' + title);
    media.addEventListener('click', function () { openDialog(url, title); });
    media.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openDialog(url, title);
    });
  });
})();
