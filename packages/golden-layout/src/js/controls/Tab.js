/**
 * Represents an individual tab within a Stack's header
 *
 * @param {lm.controls.Header} header
 * @param {lm.items.AbstractContentItem} contentItem
 *
 * @constructor
 */
lm.controls.Tab = function (header, contentItem) {
	this.header = header;
	this.contentItem = contentItem;
	this._layoutManager = this.contentItem.layoutManager;
	const isWorkspaceTab = this._layoutManager.config.settings.mode === "workspace";
	const isCustomWorkspaceTab = lm.utils.isCustomWorkspaceTab(this);
	const isCustomWorkspaceWindowTab = lm.utils.isCustomWorkspaceWindowTab(this);
	this.element = isCustomWorkspaceTab || isCustomWorkspaceWindowTab ? $(lm.controls.Tab._customTabTemplate) : $(lm.controls.Tab._template);

	this._elementOffset = 0;
	this._xOfLastReorder = 0;
	this.titleElement = isCustomWorkspaceTab ? $(undefined) : this.element.find('.lm_title');
	this.closeElement = isCustomWorkspaceTab ? $(undefined) : this.element.find('.lm_close_tab');
	this.closeElement[contentItem.config.isClosable ? 'show' : 'hide']();
	this.isActive = false;
	this.isPinned = false;
	this.title = contentItem.config.title;

	this.setTitle(this.title);
	this.contentItem.on('titleChanged', this.setTitle, this);

	if (
		this._layoutManager.config.settings.reorderEnabled === true &&
		contentItem.config.reorderEnabled === true
	) {
		this._dragListener = new lm.utils.TabDragListener(this.element);
		this._dragListener.on('dragStart', this._onDragStart, this);
		this._dragListener.on('reorderStart', this._onReorderStart, this);
		this.contentItem.on('destroy', this._dragListener.destroy, this._dragListener);
	}

	this._onTabClickFn = lm.utils.fnBind(this._onTabClick, this);
	this._onCloseClickFn = lm.utils.fnBind(this._onCloseClick, this);

	if (isWorkspaceTab && contentItem.config.noTabHeader) {
		this.element.hide();
	}

	this.element.on('mousedown touchstart', this._onTabClickFn);

	if (this.contentItem.config.isClosable) {
		this.closeElement.on('click touchstart', this._onCloseClickFn);
		this.closeElement.on('mousedown', this._onCloseMousedown);
	} else {
		this.closeElement.remove();
	}

	this.contentItem.tab = this;
	this.contentItem.emit('tab', this);
	this.contentItem.layoutManager.emit('tabCreated', this);

	if (this.contentItem.isComponent) {
		this.contentItem.container.tab = this;
		this.contentItem.container.emit('tab', this);
	}

	if (isCustomWorkspaceTab) {
		const workspaceTabOptions = this._layoutManager._componentFactory.createWorkspaceTabsOptions({ element: this.element[0], contentItem })
		this._layoutManager._componentFactory.createWorkspaceTabs(workspaceTabOptions);
	}

	if (isCustomWorkspaceWindowTab) {
		const workspaceWindowTabOptions = this._layoutManager._componentFactory.createWorkspaceWindowTabsOptions({ element: this.element[0], contentItem });
		this._layoutManager._componentFactory.createWorkspaceWindowTabs(workspaceWindowTabOptions);
	}
};

/**
 * The tab's html template
 *
 * @type {String}
 */
lm.controls.Tab._template = '<li class="lm_tab"><i class="lm_left"></i>' +
	'<span class="lm_title"></span><div class="lm_close_tab"></div>' +
	'<i class="lm_right"></i></li>';

lm.controls.Tab._customTabTemplate = `<li class="lm_tab"></li>`;

lm.utils.copy(lm.controls.Tab.prototype, {

	/**
	 * Sets the tab's title to the provided string and sets
	 * its title attribute to a pure text representation (without
	 * html tags) of the same string.
	 *
	 * @public
	 * @param {String} title can contain html
	 */
	setTitle: function (title) {
		this.title = title;
		if (!lm.utils.isCustomWorkspaceTab(this)) {
			this.element.attr('title', lm.utils.stripTags(title));
		}
		this.titleElement.html(title);
	},

	onCloseClick: undefined,
	pin: function (index) {
		if (this.isPinned) {
			return;
		}
		this.titleElement.hide();
		this.closeElement.hide();

		const currentIndex = this.header.tabs.indexOf(this);
		const lastPinnedTabIndex = this.header._getLastIndexOfPinnedTab();

		let newIndex = lastPinnedTabIndex + 1;
		if (typeof index === "number") {
			newIndex = Math.min(index, lastPinnedTabIndex + 1);;
		}

		this.header.moveTab(currentIndex, newIndex);
		this.element.addClass('lm_pinned');
		this.isPinned = true;
	},
	unpin: function () {
		if (!this.isPinned) {
			return;
		}
		this.titleElement.show();
		this.closeElement.show();

		const currentIndex = this.header.tabs.indexOf(this);
		const lastPinnedTabIndex = this.header._getLastIndexOfPinnedTab();
		if (currentIndex != lastPinnedTabIndex) {
			this.header.moveTab(currentIndex, lastPinnedTabIndex);
		}

		this.element.removeClass('lm_pinned');

		this.isPinned = false;
	},

	/**
	 * Sets this tab's active state. To programmatically
	 * switch tabs, use header.setActiveContentItem( item ) instead.
	 *
	 * @public
	 * @param {Boolean} isActive
	 */
	setActive: function (isActive) {
		if (isActive === this.isActive) {
			return;
		}
		this.isActive = isActive;

		if (isActive) {
			this.element.addClass('lm_active');
		} else {
			this.element.removeClass('lm_active');
		}
	},

	/**
	 * Destroys the tab
	 *
	 * @private
	 * @returns {void}
	 */
	_$destroy: function () {
		this.element.off('mousedown touchstart', this._onTabClickFn);
		this.closeElement.off('click touchstart', this._onCloseClickFn);
		if (this._dragListener) {
			this.contentItem.off('destroy', this._dragListener.destroy, this._dragListener);
			this._dragListener.off('dragStart', this._onDragStart);
			this._dragListener.off('reorderStart', this._onReorderStart);
			this._dragListener = null;
		}
		this.element.remove();
	},

	/**
	 * Callback for the DragListener
	 *
	 * @param   {Number} x The tabs absolute x position
	 * @param   {Number} y The tabs absolute y position
	 *
	 * @private
	 * @returns {void}
	 */
	_onDragStart: function (x, y) {
		if (this.contentItem.parent.isMaximized === true) {
			this.contentItem.parent.toggleMaximise();
		}
		const isWorkspaceLayout = this.contentItem.layoutManager.config.settings.mode === "workspace";
		const hasLessThanTwoTabs = this.contentItem.parent.header.tabs.length < 2;
		const isMissingWindowId = !this.contentItem.config.windowId && (this.contentItem.config.componentState && !this.contentItem.config.componentState.windowId);
		const isWorkspaceExtractEnabled = !this.contentItem.layoutManager.config.settings.workspaceInnerDrag && isWorkspaceLayout;

		if (isWorkspaceLayout && hasLessThanTwoTabs) {
			return;
		}

		if (!isWorkspaceLayout && isMissingWindowId) {
			return;
		}

		if (this._layoutManager.config && this._layoutManager.config.workspacesOptions.allowExtract === false &&
			this.contentItem.config.workspacesConfig && this.contentItem.config.workspacesConfig.allowExtract !== true) {
			return;
		} else if (this.contentItem.config.workspacesConfig && this.contentItem.config.workspacesConfig.allowExtract === false) {
			return;
		}

		if (isWorkspaceExtractEnabled) {
			return;
		}
		this._layoutManager.restoreMaximizedContainers.apply(this._layoutManager);
		const newProxy = new lm.controls.DragProxy(
			x,
			y,
			this._dragListener,
			this._layoutManager,
			this.contentItem,
			this.header.parent
		);

		this._layoutManager._dragProxies.push(newProxy);
	},

	_onReorderStart: function (x, y) {
		const tabX = this.element[0].getBoundingClientRect().x;
		const parentX = this.header.element[0].getBoundingClientRect().x;
		const tabXParentOffset = tabX - parentX;
		const tabWidth = this.element[0].getBoundingClientRect().width;
		this._elementOffset = tabXParentOffset - x;

		const isWorkspaceTab = this._layoutManager.config.settings.mode === "workspace";
		const isWorkspaceTabReorderLocked = isWorkspaceTab && this.contentItem.config.workspacesConfig.allowWorkspaceTabReorder === false;
		const isWindowTabReorderLocked = !isWorkspaceTab && this.contentItem.config.workspacesConfig.allowReorder === false;

		if (isWorkspaceTabReorderLocked || isWindowTabReorderLocked) {
			return;
		}

		this._xOfLastReorder = x;
		this.element.css("position", `absolute`);
		this.element.css("z-index", `42`);
		this.element.css("left", `${x + this._elementOffset}px`);
		this.element.css("width", `${tabWidth}px`);

		this._dragListener.on("reorder", this._onReorder, this);
		this._dragListener.on("reorderStop", this._onReorderStop, this);

	},
	_onReorder: function (x, y) {
		this.element.css("left", `${x + this._elementOffset}px`);
		const tabIndex = this.header.tabs.indexOf(this);

		if (this._xOfLastReorder > x && tabIndex > 0) {
			const previousTabDimensions = lm.utils.getBounds(this.header.tabs[tabIndex - 1].element);

			if (x < previousTabDimensions.x + previousTabDimensions.width / 2) {
				this.header.moveTab(tabIndex, tabIndex - 1);
				this._xOfLastReorder = x;
			}
		} else if (this._xOfLastReorder < x && tabIndex < this.header.tabs.length - 1) {
			const nextTabDimensions = lm.utils.getBounds(this.header.tabs[tabIndex + 1].element);

			if (x > nextTabDimensions.x + nextTabDimensions.width / 2) {
				this.header.moveTab(tabIndex, tabIndex + 1);
				this._xOfLastReorder = x;
			}
		}
		this.element.css("z-index", `42`);
	},
	_onReorderStop: function (x, y) {
		const tabIndex = this.header.tabs.indexOf(this);
		const lastPinnedTabIndex = this.header._getLastIndexOfPinnedTab((t) => t != this);

		// Triggered when a pinned tab is put after an unpinned one
		if (this.isPinned && lastPinnedTabIndex + 1 < tabIndex) {
			this.header.moveTab(tabIndex, lastPinnedTabIndex + 1);
		}

		// Triggered when a unpinned tab is put before a pinned one
		if (!this.isPinned && tabIndex < lastPinnedTabIndex) {
			this.header.moveTab(tabIndex, lastPinnedTabIndex);
		}

		this.element.css("left", "");
		this.element.css("width", "");
		this.element.css("position", "");
		this.element.css("z-index", `auto`);

		this._dragListener.off("reorder", this._onReorder);
		this._dragListener.off("reorderStop", this._onReorderStop);
	},
	/**
	 * Callback when the tab is clicked
	 *
	 * @param {jQuery DOM event} event
	 *
	 * @private
	 * @returns {void}
	 */
	_onTabClick: function (event) {
		// left mouse button or tap
		if (event.button === 0 || event.type === 'touchstart') {
			var activeContentItem = this.header.parent.getActiveContentItem();
			if (this.contentItem !== activeContentItem) {
				this.header.parent.setActiveContentItem(this.contentItem);
			}

			// middle mouse button
		} else if (event.button === 1 && this.contentItem.config.isClosable) {
			this._onCloseClick(event);
		}
	},

	/**
	 * Callback when the tab's close button is
	 * clicked
	 *
	 * @param   {jQuery DOM event} event
	 *
	 * @private
	 * @returns {void}
	 */
	_onCloseClick: function (event) {
		this.contentItem.layoutManager.emit('tabCloseRequested', this);
		if (this.onCloseClick) {
			this.onCloseClick(event)
		}
	},


	/**
	 * Callback to capture tab close button mousedown
	 * to prevent tab from activating.
	 *
	 * @param (jQuery DOM event) event
	 *
	 * @private
	 * @returns {void}
	 */
	_onCloseMousedown: function (event) {
		event.stopPropagation();
	}
});
