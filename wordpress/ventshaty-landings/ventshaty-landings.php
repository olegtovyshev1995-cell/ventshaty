<?php
/**
 * Plugin Name: Вентшахты: лендинги
 * Description: Лендинги «Ремонт вентиляции» и «Вентиляция для газового котла» как шаблоны страниц, с отправкой заявок на почту. Шаблон выбирается в редакторе страницы.
 * Version:     1.0.0
 * Author:      Вентшахты.рф
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: ventshaty-landings
 */

defined( 'ABSPATH' ) || exit;

define( 'VSH_DIR', plugin_dir_path( __FILE__ ) );
define( 'VSH_URL', plugin_dir_url( __FILE__ ) );

/* ------------------------------------------------------------
   Шаблоны страниц
   Файлы в templates/ собирает wordpress/build.py из HTML-версий
   в корне репозитория — руками их не правим.
   ------------------------------------------------------------ */

function vsh_pages() {
	return array(
		'vsh-remont.php'       => array(
			'label' => 'Вентшахты: ремонт вентиляции',
			'file'  => 'remont.php',
		),
		'vsh-gazifikaciya.php' => array(
			'label' => 'Вентшахты: вентиляция для газового котла',
			'file'  => 'gazifikaciya.php',
		),
	);
}

/** Слаг шаблона текущей страницы, если это один из наших лендингов. */
function vsh_current_template() {
	if ( ! is_singular( 'page' ) ) {
		return null;
	}
	$slug = get_page_template_slug( get_queried_object_id() );
	return isset( vsh_pages()[ $slug ] ) ? $slug : null;
}

// Показываем шаблоны в списке «Шаблон» в редакторе страницы
add_filter(
	'theme_page_templates',
	function ( $templates ) {
		foreach ( vsh_pages() as $slug => $page ) {
			$templates[ $slug ] = $page['label'];
		}
		return $templates;
	}
);

// Отдаём наш файл вместо шаблона темы
add_filter(
	'template_include',
	function ( $template ) {
		$slug = vsh_current_template();
		if ( $slug ) {
			$file = VSH_DIR . 'templates/' . vsh_pages()[ $slug ]['file'];
			if ( is_readable( $file ) ) {
				return $file;
			}
		}
		return $template;
	},
	99
);

/* ------------------------------------------------------------
   Настройки: Настройки → Вентшахты
   ------------------------------------------------------------ */

function vsh_defaults() {
	return array(
		'email'        => 'info@krovmast.ru',
		'thankyou_url' => 'https://xn--80adj6azabuw4a.xn--p1ai/thankyou_page.php',
		'montazh_url'  => home_url( '/' ),
	);
}

function vsh_opt( $key ) {
	$saved = get_option( 'vsh_landings', array() );
	// Пустое поле в настройках = значение по умолчанию, а не пустая ссылка
	$saved = array_filter(
		is_array( $saved ) ? $saved : array(),
		function ( $value ) {
			return '' !== $value;
		}
	);
	$all   = wp_parse_args( $saved, vsh_defaults() );
	return isset( $all[ $key ] ) ? $all[ $key ] : '';
}

add_action(
	'admin_init',
	function () {
		register_setting(
			'vsh_landings',
			'vsh_landings',
			array(
				'type'              => 'array',
				'sanitize_callback' => function ( $input ) {
					$input = is_array( $input ) ? $input : array();
					$email = sanitize_email( isset( $input['email'] ) ? $input['email'] : '' );
					if ( ! is_email( $email ) ) {
						add_settings_error( 'vsh_landings', 'email', 'Почта для заявок указана неверно — оставили прежнюю.' );
						$email = vsh_opt( 'email' );
					}
					return array(
						'email'        => $email,
						'thankyou_url' => esc_url_raw( isset( $input['thankyou_url'] ) ? $input['thankyou_url'] : '' ),
						'montazh_url'  => esc_url_raw( isset( $input['montazh_url'] ) ? $input['montazh_url'] : '' ),
					);
				},
			)
		);
	}
);

add_action(
	'admin_menu',
	function () {
		add_options_page( 'Вентшахты: лендинги', 'Вентшахты', 'manage_options', 'vsh-landings', 'vsh_render_settings' );
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=vsh-landings' ) ) . '">Настройки</a>' );
		return $links;
	}
);

function vsh_render_settings() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$fields = array(
		'email'        => array( 'Почта для заявок', 'email', 'Сюда приходят заявки с формы.' ),
		'thankyou_url' => array( 'Страница «Спасибо»', 'url', 'Куда уводим человека после отправки заявки.' ),
		'montazh_url'  => array( 'Ссылка «Монтаж под ключ»', 'url', 'Куда ведёт кнопка со страницы ремонта — обычно страница с шаблоном «вентиляция для газового котла».' ),
	);
	?>
	<div class="wrap">
		<h1>Вентшахты: лендинги</h1>
		<p>Чтобы включить лендинг, создайте страницу и в блоке «Шаблон» выберите «Вентшахты: ремонт вентиляции» или «Вентшахты: вентиляция для газового котла». Содержимое редактора на такой странице не выводится.</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'vsh_landings' ); ?>
			<table class="form-table" role="presentation">
				<?php foreach ( $fields as $key => $field ) : ?>
					<tr>
						<th scope="row"><label for="vsh-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $field[0] ); ?></label></th>
						<td>
							<input class="regular-text" type="<?php echo esc_attr( $field[1] ); ?>" id="vsh-<?php echo esc_attr( $key ); ?>" name="vsh_landings[<?php echo esc_attr( $key ); ?>]" value="<?php echo esc_attr( vsh_opt( $key ) ); ?>">
							<p class="description"><?php echo esc_html( $field[2] ); ?></p>
						</td>
					</tr>
				<?php endforeach; ?>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/* ------------------------------------------------------------
   Стили и скрипты — только на страницах-лендингах
   ------------------------------------------------------------ */

add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! vsh_current_template() ) {
			return;
		}
		// Версия = время изменения файла: после обновления плагина кэш браузера сбросится сам
		$ver = function ( $path ) {
			return (string) filemtime( VSH_DIR . $path );
		};
		wp_enqueue_style( 'vsh-fonts', 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800&family=Caveat:wght@500;700&display=swap', array(), null );
		wp_enqueue_style( 'vsh-landing', VSH_URL . 'assets/styles.css', array( 'vsh-fonts' ), $ver( 'assets/styles.css' ) );
		wp_enqueue_script( 'vsh-landing', VSH_URL . 'assets/main.js', array(), $ver( 'assets/main.js' ), true );
		wp_localize_script(
			'vsh-landing',
			'VSH_LEAD',
			array(
				'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
				'thankYouUrl' => vsh_opt( 'thankyou_url' ),
			)
		);
	},
	20
);

// Стили темы на лендинге не нужны и ломают вёрстку — снимаем их.
// Отключить: add_filter( 'vsh_dequeue_theme_styles', '__return_false' );
add_action(
	'wp_enqueue_scripts',
	function () {
		if ( ! vsh_current_template() || ! apply_filters( 'vsh_dequeue_theme_styles', true ) ) {
			return;
		}
		$roots  = array_unique( array( get_template_directory_uri(), get_stylesheet_directory_uri() ) );
		$styles = wp_styles();
		foreach ( (array) $styles->queue as $handle ) {
			$src = isset( $styles->registered[ $handle ] ) ? (string) $styles->registered[ $handle ]->src : '';
			foreach ( $roots as $root ) {
				if ( '' !== $src && 0 === strpos( $src, $root ) ) {
					wp_dequeue_style( $handle );
				}
			}
		}
		// Глобальные стили из theme.json задают шрифты и отступы всему сайту
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'classic-theme-styles' );
	},
	100
);

/** Заголовок и описание, если их не выводит тема или SEO-плагин. */
function vsh_head_meta( $title, $description ) {
	if ( ! current_theme_supports( 'title-tag' ) ) {
		echo '<title>' . esc_html( $title ) . "</title>\n";
	}
	$has_seo = defined( 'WPSEO_VERSION' ) || class_exists( 'RankMath' ) || defined( 'AIOSEO_VERSION' ) || defined( 'SEOPRESS_VERSION' );
	if ( ! $has_seo ) {
		echo '<meta name="description" content="' . esc_attr( $description ) . "\">\n";
	}
}

/* ------------------------------------------------------------
   Приём заявок с формы
   Без nonce намеренно: форма публичная, а nonce в закэшированной
   странице протухает через сутки и заявки начинают теряться.
   От спама — скрытое поле-ловушка и лимит 5 заявок в час с одного IP.
   Для CRM: add_action( 'vsh_lead_received', function ( $lead, $sent ) { … }, 10, 2 );
   ------------------------------------------------------------ */

add_action( 'wp_ajax_vsh_lead', 'vsh_handle_lead' );
add_action( 'wp_ajax_nopriv_vsh_lead', 'vsh_handle_lead' );

function vsh_post( $key ) {
	return isset( $_POST[ $key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Missing
}

function vsh_stage_label( $value ) {
	$labels = array(
		// Газификация — стадия дома
		'proekt'          => 'Проект, дом ещё не строится',
		'korobka'         => 'Коробка готова, до отделки',
		'otdelka'         => 'Идёт отделка',
		'gotov'           => 'Дом готов, нужна вентиляция',
		// Ремонт — что происходит
		'obratnaya-tyaga' => 'Задувает котёл',
		'kondensat'       => 'Конденсат, наледь',
		'slabaya-tyaga'   => 'Не тянет вытяжка',
		'protechka'       => 'Течёт кровля у трубы',
		'samodel'         => 'Самодельный узел',
		'drugoe'          => 'Другое',
	);
	return isset( $labels[ $value ] ) ? $labels[ $value ] : ( '' === $value ? 'не выбрано' : $value );
}

function vsh_handle_lead() {
	// Бот заполнил ловушку — отвечаем «успешно», чтобы он не пробовал снова
	if ( '' !== vsh_post( 'website' ) ) {
		wp_send_json_success();
	}

	$phone = vsh_post( 'phone' );
	if ( strlen( preg_replace( '/\D/', '', $phone ) ) < 10 ) {
		wp_send_json_error( array( 'message' => 'phone' ), 400 );
	}

	$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$key = 'vsh_lead_' . md5( $ip );
	$sent_count = (int) get_transient( $key );
	if ( $sent_count >= 5 ) {
		wp_send_json_error( array( 'message' => 'rate' ), 429 );
	}
	set_transient( $key, $sent_count + 1, HOUR_IN_SECONDS );

	$lead = array(
		'name'  => vsh_post( 'name' ),
		'phone' => $phone,
		'stage' => vsh_stage_label( sanitize_key( vsh_post( 'stage' ) ) ),
		'page'  => esc_url_raw( vsh_post( 'page' ) ),
		'title' => vsh_post( 'title' ),
	);

	$subject = 'Заявка с сайта: ' . ( '' !== $lead['title'] ? $lead['title'] : 'лендинг' );
	$body    = implode(
		"\n",
		array(
			'Имя: ' . ( '' !== $lead['name'] ? $lead['name'] : 'не указано' ),
			'Телефон: ' . $lead['phone'],
			'Ситуация: ' . $lead['stage'],
			'Страница: ' . $lead['page'],
			'Время: ' . wp_date( 'd.m.Y H:i' ),
		)
	);

	$sent = wp_mail( vsh_opt( 'email' ), $subject, $body, array( 'Content-Type: text/plain; charset=UTF-8' ) );

	do_action( 'vsh_lead_received', $lead, $sent );

	if ( $sent ) {
		wp_send_json_success();
	}
	wp_send_json_error( array( 'message' => 'mail' ), 500 );
}
