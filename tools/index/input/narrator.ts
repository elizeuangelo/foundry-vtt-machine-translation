/**Interface of the narration state */
interface NarrationState {
	id: number;
	display: boolean;
	message: string;
	paused: boolean;
}

/* -------------------------------------------- */
/**
 * Narrator Tools configuration menu
 */
class NarratorMenu extends FormApplication {
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			id: 'narrator-config',
			title: game.i18n.localize('NT.Title'),
			classes: ['sheet'],
			template: 'modules/narrator-tools/templates/config.html',
			width: 800,
		});
	}
	/**
	 * Get all game settings related to the form, to display them
	 * @param _options
	 */
	async getData(_options: any) {
		return {
			FontSize: game.settings.get('narrator-tools', 'FontSize'),
			WebFont: game.settings.get('narrator-tools', 'WebFont'),
			TextColor: game.settings.get('narrator-tools', 'TextColor'),
			TextShadow: game.settings.get('narrator-tools', 'TextShadow'),
			TextCSS: game.settings.get('narrator-tools', 'TextCSS'),
			Pause: game.settings.get('narrator-tools', 'Pause'),
			DurationMultiplier: game.settings.get('narrator-tools', 'DurationMultiplier'),
			BGColor: game.settings.get('narrator-tools', 'BGColor'),
			BGImage: game.settings.get('narrator-tools', 'BGImage'),
			NarrationStartPaused: game.settings.get('narrator-tools', 'NarrationStartPaused'),
		};
	}
	/**
	 * Updates the settings to match the forms
	 * @param _event
	 * @param formData The form data to be saved
	 */
	async _updateObject(_event: Event, formData: { [key: string]: any }) {
		for (let [k, v] of Object.entries(formData)) {
			game.settings.set('narrator-tools', k, v);
		}
		setTimeout(() => {
			NarratorTools._updateContentStyle();
			game.socket.emit('module.narrator-tools', { command: 'style' });
		}, 200);
	}
}

/* -------------------------------------------- */
/**
 * Primary object used by the Narrator Tools module
 */
const NarratorTools = {
	_element: $(
		'<div id="narrator" class="narrator"><div class="narrator-frame"><div class="narrator-frameBG"></div><div class="narrator-box"><div class="narrator-content"></div></div></div><div class="narrator-sidebarBG"></div><div class="narrator-bg"></div></div>'
	),
	/**
	 * Hooked function wich identifies if a message is a Narrator Tools command
	 * @param _message
	 * @param content   Message to be identified
	 * @param _data
	 */
	_chatMessage(_message: string, content: string, _data: Object) {
		if (!game.user.isGM) return;
		const narration = new RegExp('^(\\/narrat(?:e|ion)) ([^]*)', 'i');
		const description = new RegExp('^(\\/desc(?:ribe|ription|)) ([^]*)', 'i');
		const notification = new RegExp('^(\\/not(?:e|ify|ication)) ([^]*)', 'i');
		const commands = {
			narration: narration,
			description: description,
			note: notification,
		};
		// Iterate over patterns, finding the first match
		let c: string, rgx: RegExp, match: RegExpMatchArray | null;
		for ([c, rgx] of Object.entries(commands)) {
			match = content.match(rgx);
			if (match) {
				this.createChatMessage(c, match[2]);
				return false;
			}
		}
	},
	/**
	 * Control the module behavior in response to a change in the sharedState
	 * @param state The new application state
	 */
	_controller({ narration, scenery }: { narration: NarrationState; scenery: boolean }) {
		/**First, we manage the scenery changes */
		this._updateScenery(scenery);
		if (game.user.isGM) {
			const tool = ui.controls.controls[0].tools.find((tool: any) => tool.name === 'scenery');
			if (scenery) {
				$('.control-tool[title=Scenery]')[0].classList.add('active');
				tool.active = true;
			} else {
				$('.control-tool[title=Scenery]')[0].classList.remove('active');
				tool.active = false;
			}
		}

		/**Then, we control the narration's behavior */

		/**If a narration had ocurred and the display now is still on, turn it off */
		if (!narration.display && this.elements.content[0].style.opacity === '1') {
			this.elements.BG.height(0);
		}

		/**If the message suddenly disappears, turn off the opacity */
		if (!narration.message) {
			this.elements.content[0].style.opacity = '0';
		}

		/**If the display is on and the narration.id is a new one, it means a new narration is taking place */
		if (narration.display && narration.id !== this._id) {
			this._id = narration.id;
			clearTimeout(this._timeouts.narrationOpens);
			this.elements.content[0].style.opacity = '0';
			this.elements.content.stop();

			this._timeouts.narrationOpens = setTimeout(() => {
				this.elements.content.text(narration.message);
				this.elements.content[0].style.opacity = '1';
				this.elements.content[0].style.top = '0px';

				const height = Math.min(this.elements.content.height() ?? 0, 310);
				this.elements.BG.height(height * 3);

				this._timeouts.narrationOpens = 0;
				Hooks.call('narration', narration);
			}, 500);

			const fun = () => {
				if (!this.sharedState.narration.paused) {
					const scroll = (this.elements.content.height() ?? 0) - 310;

					/**If the narration is open */
					if (scroll > 0) {
						const remaining = 1 - Number(this.elements.content[0].style.top.slice(0, -2)) / -scroll;
						const duration = this.messageDuration(narration.message.length);
						const duration_multiplier = game.settings.get('narrator-tools', 'DurationMultiplier');
						this._timeouts.narrationScrolls = setTimeout(() => {
							this.elements.content.animate({ top: -scroll }, (duration - (5000 * duration_multiplier + 500)) * remaining, 'linear');
							this._timeouts.narrationScrolls = 0;
						}, 3000 * duration_multiplier);
					}
				}
			};
			Hooks.once('narration', fun);
		}

		/**If narration is paused, stop animation and clear timeouts */
		if (narration.paused) {
			if (this._timeouts.narrationScrolls) clearTimeout(this._timeouts.narrationScrolls);
			this.elements.content.stop();
		} else {
			const scroll = (this.elements.content.height() ?? 0) - 310;

			/**If the narration is already open */
			if (this.elements.content[0].style.opacity === '1' && scroll > 0) {
				const remaining = 1 - Number(this.elements.content[0].style.top.slice(0, -2)) / -scroll;
				const duration = this.messageDuration(narration.message.length);
				const duration_multiplier = game.settings.get('narrator-tools', 'DurationMultiplier');
				this.elements.content.animate({ top: -scroll }, (duration - (5000 * duration_multiplier + 500)) * remaining, 'linear');
				this._timeouts.narrationScrolls = 0;
			}
		}
	},
	/**Hook function wich creates the scenery button */
	_createSceneryButton(buttons: any) {
		let tokenButton = buttons.find((b: any) => b.name === 'token');

		if (tokenButton && game.user.isGM) {
			tokenButton.tools.push({
				name: 'scenery',
				title: game.i18n.localize('NT.ButtonTitle'),
				icon: 'fas fa-theater-masks',
				visible: game.user.isGM,
				toggle: true,
				active: this.sharedState.scenery,
				onClick: (toggle: boolean) => {
					this.scenery(toggle);
				},
			});
		}
	},
	/**Gets whats selected on screen */
	_getSelectionText() {
		const selection = window.getSelection();
		if (selection) return selection.toString();
	},
	/**
	 * Hides the journals context menu
	 * @param _e
	 */
	_hideContextMenu(_e: Event) {
		NarratorTools._menu.hide();
		document.removeEventListener('click', NarratorTools._hideContextMenu);
	},
	/**The id of the last narration update */
	_id: 0,
	/**
	 * Loads a specific font from the Google Fonts web page
	 * @param font Google font to load
	 */
	_loadFont(font: string) {
		$('#narratorWebFont').remove();
		if (font == '') return;
		const linkRel = $(
			`<link id="narratorWebFont" href="https://fonts.googleapis.com/css2?family=${font}&display=swap" rel="stylesheet" type="text/css" media="all">`
		);
		$('head').append(linkRel);
	},
	_menu: undefined as any,
	_pause() {
		if (game.user.isGM && game.settings.get('narrator-tools', 'Pause')) {
			NarratorTools.scenery(game.paused);
		}
	},
	/**Initialization routine for 'ready' hook */
	_ready() {
		this.elements = {
			/**Main Element */
			narrator: this._element,
			frame: this._element.find('.narrator-frame'),
			frameBG: this._element.find('.narrator-frameBG'),
			sidebarBG: this._element.find('.narrator-sidebarBG'),
			BG: this._element.find('.narrator-bg'),
			box: this._element.find('.narrator-box'),
			content: this._element.find('.narrator-content'),
		};
		this._updateBGColor();
		this._updateBGImage();
		this._fitSidebar();
		$('body').append(this._element);

		// @ts-ignore
		this._menu = new ContextMenuNT({
			theme: 'default', // or 'blue'
			items: [
				{
					icon: 'comment',
					name: 'Describe',
					action: () => {
						const selection = NarratorTools._getSelectionText();
						if (selection) NarratorTools.chatMessage.describe(selection);
					},
				},
				{
					icon: 'comment-dots',
					name: 'Narrate',
					action: () => {
						const selection = NarratorTools._getSelectionText();
						if (selection) NarratorTools.chatMessage.narrate(selection);
					},
				},
			],
		});
		$(document.getElementById('chat-log') as HTMLElement).on('click', '.message.narrator-chat', NarratorTools._onClickMessage.bind(NarratorTools));
		NarratorTools._loadFont(game.settings.get('narrator-tools', 'WebFont'));
		NarratorTools._updateContentStyle();
		this._controller(game.settings.get('narrator-tools', 'sharedState'));
		NarratorTools._pause();
	},
	/**Initialization routine for 'setup' hook */
	_setup() {
		// Game Settings
		// The shared state of the Narrator Tools application, emitted by the DM across all players
		// Q:   Why use a setting instead of sockets?
		// A:   So there is memory. The screen will only update with the DM present and remain in that state.
		//      For instance, the DM might leave the game with a message on screen.
		//      There should be no concurrency between sockets and this config,
		//      so we eliminated sockets altogether.
		game.settings.register('narrator-tools', 'sharedState', {
			name: game.i18n.localize('NT.state'),
			scope: 'world',
			config: false,
			default: {
				/**Displays information about whats happening on screen */
				narration: {
					id: 0,
					display: false,
					new: false,
					message: '',
					paused: false,
				} as NarrationState,
				/**If the background scenery is on or off */
				scenery: false,
			},
			onChange: (newState: { narration: NarrationState; scenery: boolean }) => this._controller(newState),
		});
		// Register the application menu
		game.settings.registerMenu('narrator-tools', 'settingsMenu', {
			name: game.i18n.localize('NT.CfgName'),
			label: game.i18n.localize('NT.CfgLabel'),
			icon: 'fas fa-adjust',
			type: NarratorMenu,
			restricted: true,
		});
		// Menu options
		game.settings.register('narrator-tools', 'FontSize', {
			name: 'Font Size',
			scope: 'world',
			config: false,
			default: '',
			type: String,
		});
		game.settings.register('narrator-tools', 'WebFont', {
			name: 'Web Font',
			scope: 'world',
			config: false,
			default: '',
			type: String,
			onChange: (value: string) => NarratorTools._loadFont(value),
		});
		game.settings.register('narrator-tools', 'TextColor', {
			name: 'Text Color',
			scope: 'world',
			config: false,
			default: '',
			type: String,
		});
		game.settings.register('narrator-tools', 'TextShadow', {
			name: 'Text Shadow',
			scope: 'world',
			config: false,
			default: '',
			type: String,
		});
		game.settings.register('narrator-tools', 'TextCSS', {
			name: 'TextCSS',
			scope: 'world',
			config: false,
			default: '',
			type: String,
		});
		game.settings.register('narrator-tools', 'Pause', {
			name: 'Pause',
			scope: 'world',
			config: false,
			default: false,
			type: Boolean,
		});
		game.settings.register('narrator-tools', 'DurationMultiplier', {
			name: 'Duration Multiplier',
			scope: 'world',
			config: false,
			default: 1,
			type: Number,
		});
		game.settings.register('narrator-tools', 'BGColor', {
			name: 'Background Color',
			scope: 'world',
			config: false,
			default: '',
			type: String,
			onChange: (color: string) => NarratorTools._updateBGColor(color),
		});
		game.settings.register('narrator-tools', 'BGImage', {
			name: 'Background Color',
			scope: 'world',
			config: false,
			default: '',
			type: String,
			onChange: (filePath: string) => NarratorTools._updateBGImage(filePath),
		});
		game.settings.register('narrator-tools', 'NarrationStartPaused', {
			name: 'Start the Narration Paused',
			scope: 'world',
			config: false,
			default: false,
			type: Boolean,
		});
	},
	/**Specify how the module's messages will be intepreted by foundry and other modules:
	 * OTHER: 0, OOC: 1, IC: 2, EMOTE: 3, WHISPER: 4, ROLL: 5
	 */
	_msgtype: 0,
	/**
	 * Behavior when a chat message is clicked
	 * @param event The event wich triggered the handler
	 */
	_onClickMessage(event: Event) {
		if (event && (event.target as HTMLElement).classList.contains('narrator-chat')) {
			//@ts-ignore
			const roll: JQuery = $(event.currentTarget);
			const tip = roll.find('.message-metadata');
			if (!tip.is(':visible')) tip.slideDown(200);
			else tip.slideUp(200);
		}
	},
	/**
	 * Process any received messages from the socket
	 * @param data Command and value to be addressed by the corresponding function
	 */
	_onMessage(data: { command: string; value: any }) {
		const commands: { [key: string]: Function } = {
			style: function () {
				NarratorTools._updateContentStyle();
			},
		};
		commands[data.command]();
	},
	/**
	 * Renders the chat message and sets out the message behavior
	 * @param message Message object to be rendered
	 * @param html HTML element of the message
	 * @param _data
	 */
	_renderChatMessage(message: any, html: JQuery<HTMLElement>, _data: any) {
		const span = html.find('.narrator-span');
		if (span.length) {
			html.find('.message-sender').text('');
			html.find('.message-metadata')[0].style.display = 'none';
			html[0].classList.add('narrator-chat');
			if (span[0].classList.contains('narration')) {
				html[0].classList.add('narrator-narrative');
			} else if (span[0].classList.contains('description')) {
				html[0].classList.add('narrator-description');
			} else if (span[0].classList.contains('note')) {
				html[0].classList.add('narrator-notification');
			}
		}
	},
	/**
	 * Hook wich triggers when the journal sheet is rendered
	 * @param _journalSheet
	 * @param html
	 */
	_renderJournalSheet(_journalSheet: any, html: JQuery<HTMLElement>) {
		let editor = '.editor-content';
		// Identifies if there is a Easy MDE Container
		const MDEContainer = html.find('.EasyMDEContainer').length;
		if (MDEContainer) editor = '.editor-preview-active';
		// Sets a timeout in case there is problem concurrency with other modules
		setTimeout(
			() =>
				html.find(editor).on('contextmenu', (e) => {
					e.preventDefault();
					const time = this._menu.isOpen() ? 100 : 0;
					this._menu.hide();
					setTimeout(() => {
						this._menu.show(e.pageX, e.pageY);
					}, time);
					document.addEventListener('click', NarratorTools._hideContextMenu, false);
				}),
			0
		);
	},
	/**Resize the sidebarBG and frame elements to match the sidebars size */
	_fitSidebar() {
		const sidebarWidth = $('body').find('.app.collapsed').length ? 0 : 305;
		this.elements.sidebarBG.width(sidebarWidth);
		this.elements.frame.width(`calc(100% - ${sidebarWidth}px)`);
	},
	/**Object containing all the timeouts called by their numbers */
	_timeouts: {
		narrationOpens: 0,
		narrationCloses: 0,
		narrationScrolls: 0,
	},
	_updateBGColor(color?: string) {
		if (!color) color = game.settings.get('narrator-tools', 'BGColor');
		if (!color) color = '#000000';
		this.elements.frameBG[0].style.boxShadow = `inset 0 0 2000px 100px ${color}`;
		this.elements.BG[0].style.background = `linear-gradient(transparent 0%, ${color}a8 40%, ${color}a8 60%, transparent 100%)`;
	},
	_updateBGImage(filePath?: string) {
		if (!filePath) filePath = game.settings.get('narrator-tools', 'BGImage');
		if (!filePath) this.elements.frameBG[0].style.background = '';
		else {
			this.elements.frameBG[0].style.background = `url(${filePath})`;
			this.elements.frameBG[0].style.backgroundSize = '100% 100%';
		}
	},
	/**Update the content element style to match the settings */
	_updateContentStyle() {
		const style = game.settings.get('narrator-tools', 'TextCSS');
		if (style) {
			const opacity = this.elements.content[0].style.opacity;
			//@ts-ignore
			this.elements.content[0].style = style;
			this.elements.content[0].style.opacity = opacity;
			return;
		}
		this.elements.content[0].style.fontFamily = `${game.settings.get('narrator-tools', 'WebFont')}`;
		this.elements.content[0].style.fontSize = `${game.settings.get('narrator-tools', 'FontSize')}`;
		this.elements.content[0].style.color = `${game.settings.get('narrator-tools', 'TextColor')}`;
		this.elements.content[0].style.textShadow = `${game.settings.get('narrator-tools', 'TextShadow')}`;
	},
	/**Updates the background opacity to match the scenery */
	_updateScenery(scenery?: boolean) {
		if (!scenery) scenery = this.sharedState.scenery;
		const new_state = scenery ? '1' : '0';
		if (this.elements.frameBG[0].style.opacity === new_state) return;
		this.elements.frameBG[0].style.opacity = new_state;
		this.elements.sidebarBG[0].style.opacity = new_state;
	},
	/**Shortcut object for creating chat messages */
	chatMessage: {
		/**
		 * Creates a 'description' chat message
		 * @param message
		 * @param options - Change the chat message configuration
		 */
		describe(message: string, options = {}) {
			return NarratorTools.createChatMessage('description', message, options);
		},
		/**
		 * Creates a 'narration' chat message
		 * @param message - single message or an array of messages to be consecutively displayed
		 * @param options - Change the chat message configuration
		 */
		narrate(message: string | string[], options = {}) {
			if (typeof message == 'string') {
				message = [message];
			}

			let res = NarratorTools.createChatMessage('narration', message[0], options);

			if (res) {
				for (let i = 1; i < message.length; i++) {
					res = res.then(() => NarratorTools.createChatMessage('narration', message[i], options));
				}
			}

			return res;
		},
		/**
		 * Creates a 'notification' chat message
		 * @param message
		 * @param options - Change the chat message configuration
		 */
		notify(message: string, options = {}) {
			return NarratorTools.createChatMessage('note', message, options);
		},
	},
	/**
	 * Creates a chat message of the specified type
	 * @param type     'narrate' for narrations or anything else for descriptions
	 * @param message
	 * @param options - Change the chat message configuration
	 */
	createChatMessage(type: string, message: string, options = {}) {
		if (!game.user.isGM) return;

		message = message.replace(/\\n|<br>/g, '\n');

		const chatData = {
			content: `<span class="narrator-span ${type}">${message}</span>`,
			type: this._msgtype,
			speaker: {
				alias: game.i18n.localize('NT.Narrator'),
				scene: game.user.viewedScene,
			},
			...options,
		};

		/**If the message is a narration, start the protocol */
		if (type === 'narration') {
			const narration = new Promise((resolve) => {
				Hooks.once('narration_closes', (narration: { id: number; message: string }) => {
					resolve(narration.message == message);
				});
			});

			if (this._timeouts.narrationOpens) {
				clearTimeout(this._timeouts.narrationOpens);
				this._timeouts.narrationOpens = 0;
			}
			if (this._timeouts.narrationCloses) {
				clearTimeout(this._timeouts.narrationCloses);
				this._timeouts.narrationCloses = 0;
			}

			let duration = this.messageDuration(message.length);

			let state: NarrationState = {
				id: this.sharedState.narration.id + 1,
				display: true,
				message: message,
				paused: game.settings.get('narrator-tools', 'NarrationStartPaused'),
			};

			this.sharedState.narration = state;

			this._timeouts.narrationCloses = setTimeout(() => {
				state.display = false;
				state.message = '';
				this.sharedState.narration = state;
				this._timeouts.narrationCloses = 0;
				Hooks.call('narration_closes', { id: state.id, message });
			}, duration);

			ChatMessage.create(chatData, {});
			return narration;
		}

		ChatMessage.create(chatData, {});
	},
	/**Shortcuts for easy access of the elements of the module */
	elements: {} as {
		/**Main Element */
		narrator: JQuery<HTMLElement>;
		frame: JQuery<HTMLElement>;
		frameBG: JQuery<HTMLElement>;
		sidebarBG: JQuery<HTMLElement>;
		BG: JQuery<HTMLElement>;
		box: JQuery<HTMLElement>;
		content: JQuery<HTMLElement>;
	},
	/**
	 * Returns the calculated duration a string of length size would have
	 * @param length    The lenght of the string
	 */
	messageDuration(length: number) {
		//@ts-ignore
		return (Math.clamped(2000, length * 80, 20000) + 3000) * game.settings.get('narrator-tools', 'DurationMultiplier') + 500;
	},
	/**
	 * Set the background scenery and calls all clients
	 * @param state True to turn on the scenery, false to turn it off
	 */
	scenery(state: boolean) {
		if (game.user.isGM) {
			this.sharedState.scenery = state ?? !this.sharedState.scenery;
		}
	},
	/**The shared state of the Narrator Tools application, emitted by the DM across all players */
	sharedState: {
		get narration() {
			return game.settings.get('narrator-tools', 'sharedState').narration;
		},
		set narration(state: NarrationState) {
			const sharedState = { ...game.settings.get('narrator-tools', 'sharedState'), narration: state };
			game.settings.set('narrator-tools', 'sharedState', sharedState);
		},
		get scenery() {
			return game.settings.get('narrator-tools', 'sharedState').scenery;
		},
		set scenery(state: boolean) {
			const sharedState = { ...game.settings.get('narrator-tools', 'sharedState'), scenery: state };
			game.settings.set('narrator-tools', 'sharedState', sharedState);
		},
	},
};

/* -------------------------------------------- */
Hooks.on('setup', () => NarratorTools._setup());
Hooks.on('ready', () => NarratorTools._ready());
Hooks.on('chatMessage', NarratorTools._chatMessage.bind(NarratorTools)); // This hook spans the chatmsg
Hooks.on('renderChatMessage', NarratorTools._renderChatMessage.bind(NarratorTools)); // This hook changes the chat message in case its a narration + triggers
Hooks.on('getSceneControlButtons', NarratorTools._createSceneryButton.bind(NarratorTools));
Hooks.on('sidebarCollapse', NarratorTools._fitSidebar.bind(NarratorTools));
Hooks.on('renderJournalSheet', NarratorTools._renderJournalSheet.bind(NarratorTools));
Hooks.on('pauseGame', (_pause: boolean) => NarratorTools._pause());
