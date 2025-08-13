import variablesCSS from './css/variables.css';
import modalCSS from './css/modal.css';
import confirmModalCSS from './css/confirmModal.css';
import formCSS from './css/form.css';
import buttonsCSS from './css/buttons.css';
import messagesCSS from './css/messages.css';
import resultsCSS from './css/results.css';
import animationsCSS from './css/animations.css';
import darkThemeCSS from './css/dark-theme.css';
import detailsCSS from './css/details.css';
import tagsCSS from './css/tags.css';
import loaderCSS from './css/loader.css';
import historyCSS from './css/history.css';
import choicesCSS from 'choices.js/public/assets/styles/choices.min.css';
import { defaultConfig } from './utils/config';
import IdentitySearch from './features/identitySearch';
import IdentityView from './features/identityView';
import IdentityForm from './features/identityForm';
import IdentityHistory from './features/identityHistory';
import IdentityCompare from './features/identityCompare';

export default class IdentityPicker {
    /**
     * Creates an instance of IdentityPicker.
     * @param {string} uniqueId - Unique identifier for this picker instance
     * @param {Object} options - Configuration options to override defaults
     */
    constructor(uniqueId, options = {}) {
        this.uniqueId = uniqueId;
        this.config = { ...defaultConfig, ...options };
        this.permissions = {
            search: false,
            creation: false,
            update: false,
            view: false,
            create_task: false
        };
        this.openButton = document.getElementById(`ip-open-button-${uniqueId}`);
        this.rules = null;
        this.shadowRoot = null;
        this.shadowHost = null;
        this.init();
    }

    /**
     * Initializes the identity picker component.
     * @returns {Promise<void>}
     */
    async init() {
        this.openButton.disabled = true;
        try {
            await this.fetchAndApplyPermissions();
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
            this.openButton.textContent = 'Permissions ' + error;
            this.openButton.disabled = true;
            return;
        }
        if (Object.values(this.permissions).some(Boolean)) {
            try {
                await this.fetchRules();
            } catch (error) {
                console.error('Failed to fetch rules:', error);
                this.openButton.textContent = error;
                this.openButton.disabled = true;
                return;
            }
            this.identitySearch = new IdentitySearch(this);
            this.identityView = new IdentityView(this);
            this.identityForm = new IdentityForm(this);
            this.identityHistory = new IdentityHistory(this);
            this.identityCompare = new IdentityCompare(this);
            await this.createModal();
            if (this.config.autoFill && this.config.cuid != null && this.config.cuid !== '') {
                setTimeout(() => this.identityView.autoFillIdentity(this.config.cuid), 0);
            }
            this.openButton.addEventListener('click', (event) => {
                event.preventDefault();
                this.openModal();
            });
            this.initSideContainer();
            this.openButton.disabled = false;
        } else {
            this.openButton.textContent = 'user permission empty';
            this.openButton.disabled = true;
        }
    }

    /**
     * Fetches user permissions from the API and applies configuration.
     * @returns {Promise<void>}
     * @throws {Error} If permissions cannot be fetched
     */
    async fetchAndApplyPermissions() {
        try {
            const response = await fetch(this.config.endpoints.permissions);
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
            }
            const permissions = await response.json();
            this.permissions = {
                search: this.config.search && permissions.SEARCH,
                creation: this.config.creation && permissions.CREATE,
                update: this.config.update && permissions.UPDATE,
                view: permissions.VIEW,
                create_task: this.config.create_task && permissions.CREATE_TASK
            };
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
            throw error;
        }
    }

    /**
     * Fetches business rules and referential data from the API.
     * @returns {Promise<void>}
     * @throws {Error} If rules cannot be fetched
     */
    async fetchRules() {
        try {
            const response = await fetch(this.config.endpoints.rules);
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
            }
            this.rules = await response.json();
            if (!this.rules.contract) {
                throw new Error('Le contrat est null ou indisponible');
            }
        } catch (error) {
            console.error('Failed to fetch rules:', error);
            throw error;
        }
    }

    /**
     * Creates the modal structure with shadow DOM.
     * @returns {Promise<void>}
     */
    async createModal() {
        this.shadowHost = document.createElement('div');
        this.shadowHost.id = `ip-shadow-host-${this.uniqueId}`;
        document.body.appendChild(this.shadowHost);
        this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });
        const styleElement = document.createElement('style');
        const allStyles = [
            choicesCSS,
            variablesCSS,
            modalCSS,
            confirmModalCSS,
            formCSS,
            buttonsCSS,
            messagesCSS,
            resultsCSS,
            animationsCSS,
            darkThemeCSS,
            detailsCSS,
            tagsCSS,
            loaderCSS,
            historyCSS,
        ];
        styleElement.textContent = allStyles.map(style =>
            typeof style === 'string' ? style : (style && style.default ? style.default : '')
        ).join('\n');
        this.shadowRoot.appendChild(styleElement);
        this.modal = document.createElement('div');
        this.modal.className = 'ip-modal';
        if (this.config.cuid != null && this.config.cuid !== '') {
            this.modal.setAttribute('data-cuid', this.config.cuid);
        }
        this.modal.innerHTML = this.getModalHTML();
        this.shadowRoot.appendChild(this.modal);
        this.modalContent = this.shadowRoot.querySelector('.ip-modal-content');
        this.searchContainer = this.shadowRoot.querySelector('.ip-search-container');
        this.resultsContainer = this.shadowRoot.querySelector('.ip-results-container');
        this.detailsContainer = this.shadowRoot.querySelector('.ip-details-container');
        this.historyContainer = this.shadowRoot.querySelector('.ip-history-container');
        this.compareContainer = this.shadowRoot.querySelector('.ip-compare-container');
        this.identityFormContainer = this.shadowRoot.querySelector('.ip-create-identity-container');
        this.backButton = this.shadowRoot.querySelector('.ip-back');
        this.infoMessage = this.shadowRoot.querySelector('.ip-info-message');
        this.contentArea = this.shadowRoot.querySelector('.ip-content-area');
        this.headerTitle = this.shadowRoot.querySelector('.ip-header h2');
        this.modalHeader = this.shadowRoot.querySelector('.ip-header');
        this.modalFooter = this.shadowRoot.querySelector('.ip-footer');
        this.modalScrollableContent = this.shadowRoot.querySelectorAll('.ip-scrollable-content');
        await this.identitySearch.initSearchView();
        this.shadowRoot.querySelector('.ip-close').addEventListener('click', () => this.closeModal());
        this.backButton.addEventListener('click', () => this.showSearchView());
    }

    /**
     * Generates the HTML structure for the modal.
     * @returns {string} The modal HTML template
     */
    getModalHTML() {
        return `
            <div class="ip-modal-content">
                <div class="ip-header">
                    <div class="ip-header-container">
                        <span class="ip-back" style="display: none;">&#8592;</span>
                        <h2></h2>
                        <button class="ip-close ip-button-light ip-button-rounded">&times;</button>
                    </div>
                </div>
                <div class="ip-main-container">
                    <div class="ip-scrollable-content">
                        <div class="ip-content-area">
                            <div class="ip-info-message" style="display: none;"></div>
                            <div class="ip-search-container" style="display: none;"></div>
                            <div class="ip-results-container" style="display: none;"></div>
                            <div class="ip-compare-container" style="display: none;"></div>
                            <div class="ip-details-container" style="display: none;"></div>
                            <div class="ip-create-identity-container" style="display: none;"></div>
                            <div class="ip-loading-container" style="display: none;">
                                <div class="ip-loader"></div>
                                <div class="ip-loading-message"></div>
                            </div>
                        </div>
                    </div>
                    <div class="ip-side-container" style="display: none;">
                        <div class="ip-header">
                            <div class="ip-header-container">
                                <h2></h2>
                                <button class="ip-side-close ip-button-light ip-button-rounded">×</button>
                            </div>
                        </div>
                        <div class="ip-scrollable-content">
                            <div class="ip-content-area"></div>
                        </div>
                    </div>
                </div>
                <div class="ip-footer" style="display:none"></div>
            </div>
        `;
    }

    /**
     * Initializes the side container for additional content.
     * @returns {void}
     */
    initSideContainer() {
        this.sideContainer = this.shadowRoot.querySelector('.ip-side-container');
        this.sideContent = this.sideContainer.querySelector('.ip-content-area');
        this.sideCloseButton = this.sideContainer.querySelector('.ip-side-close');
        this.sideCloseButton.addEventListener('click', () => this.closeSideContainer());
    }

    /**
     * Opens the side container with content.
     * @param {string} title - The title for the side container
     * @param {string} content - The HTML content to display
     * @returns {void}
     */
    openSideContainer(title, content) {
        this.sideContainer.querySelector('h2').textContent = title;
        this.sideContent.innerHTML = content;
        this.sideContainer.style.display = 'block';
        this.modalContent.classList.add('with-side-container');
        this.adjustModalLayout();
    }

    /**
     * Closes the side container.
     * @returns {void}
     */
    closeSideContainer() {
        this.sideContainer.style.display = 'none';
        this.modalContent.classList.remove('with-side-container');
        this.adjustModalLayout();
    }

    /**
     * Adjusts modal layout based on screen size and container state.
     * @returns {void}
     */
    adjustModalLayout() {
        const screenWidth = window.innerWidth;
        const breakpoint = 1280;
        if (screenWidth >= breakpoint) {
            this.modalContent.classList.add('side-by-side');
            this.sideContainer.classList.remove('overlay');
        } else {
            this.modalContent.classList.remove('side-by-side');
            this.sideContainer.classList.add('overlay');
        }
        this.adjustModalHeight();
    }

    /**
     * Shows a message in the info message area.
     * @param {string} messageKey - The language key for the message
     * @param {string} type - The message type ('info', 'error', 'success', 'warning')
     * @param {string} description - Optional description text
     * @returns {void}
     */
    showMessage(messageKey, type, description = '') {
        const messageText = this.rules.language[messageKey] || messageKey;
        this.infoMessage.innerHTML = `
            <p class="ip-info-message-main">${messageText}</p>
            ${description ? `<p class="ip-info-message-description">${description}</p>` : ''}
            <span class="ip-info-message-close">&times;</span>
        `;
        this.infoMessage.className = `ip-info-message ${type}`;
        this.infoMessage.style.display = 'block';
        const closeButton = this.infoMessage.querySelector('.ip-info-message-close');
        closeButton.addEventListener('click', () => this.hideInfoMessage());
        this.adjustModalHeight();
    }

    /**
     * Removes the current message from display.
     * @returns {void}
     */
    removeMessage() {
        this.infoMessage.style.display = 'none';
        this.infoMessage.innerHTML = '';
    }

    /**
     * Shows the search view.
     * @returns {void}
     */
    showSearchView() {
        this.closeSideContainer();
        this.transitionView(this.searchContainer);
        this.backButton.style.display = 'none';
        this.modalContent.classList.remove('wide-view');
        this.setHeaderTitle(this.rules.language.searchTitle);
    }

    /**
     * Shows the results view.
     * @returns {void}
     */
    showResultsView() {
        this.closeSideContainer();
        if (this.resultsContainer.querySelector('.ip-results-list') && this.resultsContainer.querySelector('.ip-results-list').children.length === 0) {
            this.showSearchView();
            return;
        }
        this.transitionView(this.resultsContainer);
        this.backButton.style.display = 'inline';
        this.backButton.onclick = () => this.showSearchView();
        this.modalContent.classList.remove('wide-view');
        this.setHeaderTitle(this.rules.language.resultsTitle);
    }

    /**
     * Shows the comparison view.
     * @returns {void}
     */
    showCompareView() {
        this.closeSideContainer();
        this.transitionView(this.compareContainer);
        this.backButton.style.display = 'inline';
        this.backButton.onclick = () => this.showResultsView();
        this.modalContent.classList.add('wide-view');
        this.setHeaderTitle(this.rules.language.compareTitle);
        this.identityCompare.renderCompareTable();
    }

    /**
     * Shows the details view for a specific identity.
     * @param {string} custumerId - The customer ID to display
     * @param {string} previousView - The view to return to
     * @param {string} messageType - Optional message type
     * @param {string} message - Optional message key
     * @param {string} description - Optional message description
     * @returns {void}
     */
    showDetailsView(custumerId, previousView, messageType, message, description) {
        this.closeSideContainer();
        this.transitionView(this.detailsContainer);
        if (this.permissions.search && previousView !== 'none') {
            this.backButton.style.display = 'inline';
            this.backButton.onclick = () => this.showView(previousView, custumerId);
        } else {
            this.backButton.style.display = 'none';
        }
        this.modalContent.classList.add('wide-view');
        this.setHeaderTitle(this.rules.language.detailsTitle);
        this.identityView.loadIdentityDetails(custumerId);
        if (messageType && message) {
            this.showMessage(message, messageType, description ? description : '');
        }
    }

    /**
     * Shows a specific view based on the view name.
     * @param {string} view - The view name ('search', 'results', 'details', 'compare')
     * @param {string} custumerId - Optional customer ID for details view
     * @returns {void}
     */
    showView(view, custumerId) {
        switch (view) {
            case 'search':
                this.showSearchView();
                break;
            case 'results':
                this.showResultsView();
                break;
            case 'details':
                this.showDetailsView(custumerId, view);
                break;
            case 'compare':
                this.showCompareView();
                break;
            default:
                this.showSearchView();
        }
    }

    /**
     * Shows the identity form view for create or modify.
     * @param {string|null} custumerId - Customer ID for modify, null for create
     * @returns {void}
     */
    showIdentityFormView(custumerId = null) {
        this.hideInfoMessage();
        this.closeSideContainer();
        this.transitionView(this.identityFormContainer);
        if (this.permissions.search) {
            this.backButton.style.display = 'inline';
            this.backButton.onclick = () => {
                if (custumerId) {
                    this.showDetailsView(custumerId, 'results');
                } else {
                    this.showResultsView();
                }
            }
        } else {
            this.backButton.style.display = 'none';
        }
        if (custumerId) {
            this.identityForm.showModifyIdentityForm(custumerId);
        } else {
            this.identityForm.showCreateIdentityForm();
        }
        const headerTitle = custumerId ? this.rules.language.modifyTitle : this.rules.language.createTitle;
        this.setHeaderTitle(headerTitle);
    }

    /**
     * Sets the header title text.
     * @param {string} title - The title text to display
     * @returns {void}
     */
    setHeaderTitle(title) {
        this.headerTitle.textContent = title;
    }

    /**
     * Transitions between views with animation.
     * @param {HTMLElement} showElement - The element to show
     * @returns {void}
     */
    transitionView(showElement) {
        this.removeMessage();
        this.modalContent.style.removeProperty('max-width');
        [this.searchContainer, this.resultsContainer, this.detailsContainer, this.identityFormContainer, this.compareContainer].forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });
        showElement.style.display = 'block';
        showElement.classList.add('active');
        this.adjustModalHeight();
    }

    /**
     * Adjusts the modal height based on viewport.
     * @returns {void}
     */
    adjustModalHeight() {
        this.modalContent.style.maxHeight = `${window.innerHeight * 0.9}px`;
        this.modalScrollableContent.forEach(el => {
            el.style.maxHeight = `${window.innerHeight * 0.9 - this.modalHeader.offsetHeight - this.modalFooter.offsetHeight}px`;
        });
    }

    /**
     * Shows the loading indicator with a message.
     * @param {string} message - The loading message to display
     * @returns {void}
     */
    showLoading(message = this.rules.language.loading) {
        this.closeSideContainer();
        this.scrollToTop();
        const loadingContainer = this.shadowRoot.querySelector('.ip-loading-container');
        const loadingMessage = loadingContainer.querySelector('.ip-loading-message') || this.createLoadingMessage();
        loadingMessage.textContent = message;
        loadingContainer.style.display = 'flex';
        void loadingContainer.offsetWidth;
        loadingContainer.classList.add('show');
    }

    /**
     * Hides the info message.
     * @returns {void}
     */
    hideInfoMessage() {
        this.infoMessage.style.display = 'none';
        this.infoMessage.innerHTML = '';
        this.adjustModalHeight();
    }

    /**
     * Creates a loading message element.
     * @returns {HTMLElement} The loading message element
     */
    createLoadingMessage() {
        this.hideInfoMessage();
        const messageElement = document.createElement('div');
        messageElement.className = 'ip-loading-message';
        const loadingContainer = this.shadowRoot.querySelector('.ip-loading-container');
        loadingContainer.appendChild(messageElement);
        return messageElement;
    }

    /**
     * Hides the loading indicator.
     * @returns {void}
     */
    hideLoading() {
        this.scrollToTop();
        const loadingContainer = this.shadowRoot.querySelector('.ip-loading-container');
        loadingContainer.classList.remove('show');
        setTimeout(() => {
            loadingContainer.style.display = 'none';
        }, 300);
    }

    /**
     * Scrolls all scrollable content to top.
     * @returns {void}
     */
    scrollToTop() {
        this.modalScrollableContent.forEach(el => {
            el.scrollTop = 0;
        });
    }

    /**
     * Opens the modal dialog.
     * @returns {void}
     */
    openModal() {
        this.modal.style.display = 'flex';
        const hasSearchPermission = this.permissions.search;
        const hasViewPermission = this.permissions.view;
        const modalCuid = this.modal.getAttribute('data-cuid');
        if (!hasSearchPermission && !hasViewPermission) {
            this.showMessage('noPermissions', 'error');
        } else if (hasViewPermission && modalCuid) {
            // If search is disabled, don't provide a way back to search
            const previousView = hasSearchPermission ? 'search' : 'none';
            this.showDetailsView(modalCuid, previousView);
        } else if (hasViewPermission && !modalCuid && !hasSearchPermission) {
            this.showMessage('noCuid', 'error');
        } else {
            this.showSearchView();
        }
        document.body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            this.modal.classList.add('ip-modal-open');
            this.adjustModalHeight();
        });
    }

    /**
     * Closes the modal dialog with animation.
     * @returns {void}
     */
    closeModal() {
        this.modal.classList.remove('ip-modal-open');
        this.modal.classList.add('ip-modal-closing');
        setTimeout(() => {
            document.body.style.overflow = '';
            this.modal.style.display = 'none';
            this.modal.classList.remove('ip-modal-closing');
            // Reset forms after modal is fully closed
            setTimeout(() => {
                this.resetSearchForms();
            }, 200);
        }, 300);
    }

    /**
     * Resets all search forms to their initial state.
     * @returns {void}
     */
    resetSearchForms() {
        if (this.identitySearch) {
            this.identitySearch.resetForms();
        }
        this.showSearchView();
        this.resultsContainer.innerHTML = '';
        this.detailsContainer.innerHTML = '';
        this.identityFormContainer.innerHTML = '';
        this.compareContainer.innerHTML = '';
        this.removeMessage();
    }

    /**
     * Shows a confirmation dialog.
     * @param {string} title - The dialog title
     * @param {string} message - The confirmation message
     * @param {Function} onConfirm - Callback function when confirmed
     * @returns {void}
     */
    showConfirmDialog(title, message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'ip-confirm-modal ip-modal ip-modal-open';
        modal.innerHTML = `
            <div class="ip-confirm-dialog ip-modal-content">
                <h2>${title}</h2>
                <p>${message}</p>
                <div class="ip-confirm-buttons">
                    <button class="ip-button-light ip-cancel-btn">
                        ${this.rules.language.cancelButton || 'Cancel'}
                    </button>
                    <button class="ip-confirm-btn">
                        ${this.rules.language.confirmButton || 'Confirm'}
                    </button>
                </div>
            </div>
        `;
        const closeModal = () => this.shadowRoot.removeChild(modal);
        modal.querySelector('.ip-cancel-btn').addEventListener('click', closeModal);
        modal.querySelector('.ip-confirm-btn').addEventListener('click', () => {
            onConfirm();
            closeModal();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        this.shadowRoot.appendChild(modal);
    }
}