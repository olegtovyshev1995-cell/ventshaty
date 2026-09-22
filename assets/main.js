/* ============================================================
   Вентшахты.рф — страница газификации
   1. Переключение объектов в галерее «эконом-вариант / наш вариант»
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
        alt: 'Неутеплённая сэндвич-труба на фасаде деревянного дома'
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
    usual: 'Фото эконом-варианта для этого объекта',
    ours: 'Фото нашего варианта для этого объекта'
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
    // Ссылку берём сначала из самой карточки (data-video-url) — так у каждой
    // страницы свои ролики, — и только потом из общего VIDEO_URLS.
    var url = card.getAttribute('data-video-url') || VIDEO_URLS[i];
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

  /* --------------------------------------------------------
     3. Сквозная кнопка на мобильном
     Показываем, когда первый экран ушёл вверх, и убираем,
     когда человек долистал до формы — иначе панель её накрывает.
     -------------------------------------------------------- */

  var sticky = document.getElementById('sticky-cta');
  var hero = document.querySelector('.hero');
  var zayavka = document.getElementById('zayavka');

  if (sticky && hero && zayavka && 'IntersectionObserver' in window) {
    var heroGone = false;
    var formSeen = false;

    var applyStickyState = function () {
      sticky.hidden = !(heroGone && !formSeen);
    };

    new IntersectionObserver(function (entries) {
      heroGone = !entries[0].isIntersecting;
      applyStickyState();
    }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);

    new IntersectionObserver(function (entries) {
      formSeen = entries[0].isIntersecting;
      applyStickyState();
    }).observe(zayavka);
  }

  /* --------------------------------------------------------
     4. Форма заявки
     -------------------------------------------------------- */

  // Куда уводим человека после успешной отправки
  var THANK_YOU_URL = 'https://вентшахты.рф/thankyou_page.php';

  /**
   * TODO: подключить отправку заявки.
   * Сейчас функция ничего не отправляет — форма проверяет поля и сразу
   * уводит на страницу «спасибо», то есть заявка никуда не приходит.
   * Подставьте сюда запрос в CRM или на почтовый обработчик, например:
   *
   *   return fetch('/api/lead', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify(lead)
   *   }).then(function (r) {
   *     if (!r.ok) throw new Error('lead: ' + r.status);
   *   });
   *
   * Редирект произойдёт только после того, как промис здесь выполнится.
   */
  var sendLead = function (lead) {
    if (window.console) console.info('Заявка (отправка не подключена):', lead);
    return Promise.resolve();
  };

  var form = document.getElementById('lead-form');

  if (form) {
    var phone = document.getElementById('lead-phone');
    var phoneError = document.getElementById('lead-phone-error');
    var consent = document.getElementById('lead-consent');
    var consentError = document.getElementById('lead-consent-error');
    var done = document.getElementById('lead-done');

    // Номер считаем пригодным, если в нём набралось хотя бы 10 цифр
    var digits = function (value) { return (value || '').replace(/\D/g, ''); };

    var setError = function (input, node, show) {
      if (node) node.hidden = !show;
      if (input) {
        input.classList.toggle('is-invalid', show);
        input.setAttribute('aria-invalid', show ? 'true' : 'false');
      }
    };

    phone.addEventListener('input', function () {
      if (digits(phone.value).length >= 10) setError(phone, phoneError, false);
    });
    consent.addEventListener('change', function () {
      if (consent.checked) setError(null, consentError, false);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var phoneOk = digits(phone.value).length >= 10;
      var consentOk = consent.checked;

      setError(phone, phoneError, !phoneOk);
      setError(null, consentError, !consentOk);

      if (!phoneOk) { phone.focus(); return; }
      if (!consentOk) { consent.focus(); return; }

      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;

      sendLead({
        name: form.elements.name.value.trim(),
        phone: phone.value.trim(),
        stage: form.elements.stage.value,
        page: location.pathname
      }).then(function () {
        // Подтверждение на случай, если переход не сработает
        done.hidden = false;
        window.location.assign(THANK_YOU_URL);
      }).catch(function () {
        setError(phone, phoneError, false);
        if (window.alert) alert('Не получилось отправить заявку. Позвоните, пожалуйста: +7 (495) 119-72-85');
      }).then(function () {
        button.disabled = false;
      });
    });
  }
})();
