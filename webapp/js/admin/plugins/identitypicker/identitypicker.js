import './css/variables.css';
import './css/modal.css';
import './css/form.css';
import './css/buttons.css';
import './css/messages.css';
import './css/results.css';
import './css/animations.css';
import './css/dark-theme.css';
import './css/details.css';
import './css/tags.css';
import './css/loader.css';
import './css/history.css';
import 'choices.js/public/assets/styles/choices.min.css';

import { defaultConfig } from './utils/config';
import { ATTRIBUTE_GROUPS } from './utils/constants';
import IdentitySearch from './features/identitySearch';
import IdentityView from './features/identityView';
import IdentityForm from './features/identityForm';
import IdentityHistory from './features/identityHistory';

export default class IdentityPicker {
  constructor(uniqueId, options = {}) {
    this.uniqueId = uniqueId;
    this.config = { ...defaultConfig, ...options };
    this.attributeGroups = ATTRIBUTE_GROUPS;
    this.permissions = { search: false, creation: false, update: false, view: false, create_task: false };
    this.openButton = document.getElementById(`ip-open-button-${uniqueId}`);
    this.rules = null;
    this.init();
  }

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
        this.openButton.textContent = 'Referential ' + error;
        this.openButton.disabled = true;
        return;
      }
      this.identitySearch = new IdentitySearch(this);
      this.identityView = new IdentityView(this);
      this.identityForm = new IdentityForm(this);
      this.identityHistory = new IdentityHistory(this);

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

  async fetchAndApplyPermissions() {
    try {
      const response = await fetch(this.config.endpoints.permissions);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
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

  async fetchRules() {
    try {
      const response = await fetch(this.config.endpoints.rules);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      this.rules = await response.json();
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      throw error;
    }
  }

  async createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'ip-modal';

    if (this.config.cuid != null && this.config.cuid !== '') {
      this.modal.setAttribute('data-cuid', this.config.cuid);
    }

    this.modal.innerHTML = this.getModalHTML();
    document.body.appendChild(this.modal);

    this.modalContent = this.modal.querySelector('.ip-modal-content');
    this.searchContainer = this.modal.querySelector('.ip-search-container');
    this.resultsContainer = this.modal.querySelector('.ip-results-container');
    this.detailsContainer = this.modal.querySelector('.ip-details-container');
    this.historyContainer = this.modal.querySelector('.ip-history-container');
    this.createIdentityContainer = this.modal.querySelector('.ip-create-identity-container');
    this.backButton = this.modal.querySelector('.ip-back');
    this.infoMessage = this.modal.querySelector('.ip-info-message');
    this.contentArea = this.modal.querySelector('.ip-content-area');
    this.headerTitle = this.modal.querySelector('.ip-header h2');
    this.modalHeader = this.modal.querySelector('.ip-header');
    this.modalFooter = this.modal.querySelector('.ip-footer');
    this.modalScrollableContent = this.modal.querySelectorAll('.ip-scrollable-content');

    await this.identitySearch.initSearchView();

    this.modal.querySelector('.ip-close').addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) this.closeModal();
    });

    this.backButton.addEventListener('click', () => this.showSearchView());
  }

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

  initSideContainer() {
    this.sideContainer = this.modal.querySelector('.ip-side-container');
    this.sideContent = this.sideContainer.querySelector('.ip-content-area');
    this.sideCloseButton = this.sideContainer.querySelector('.ip-side-close');

    this.sideCloseButton.addEventListener('click', () => this.closeSideContainer());
  }

  openSideContainer(title, content) {
    this.sideContainer.querySelector('h2').textContent = title;
    this.sideContent.innerHTML = content;
    this.sideContainer.style.display = 'block';
    this.modalContent.classList.add('with-side-container');
    this.adjustModalLayout();
  }

  closeSideContainer() {
    this.sideContainer.style.display = 'none';
    this.modalContent.classList.remove('with-side-container');
    this.adjustModalLayout();
  }

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

  showInfoMessage(messageKey, type, description = '') {
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

  showSearchView() {
    this.closeSideContainer();
    this.transitionView(this.searchContainer);
    this.backButton.style.display = 'none';
    this.modalContent.classList.remove('wide-view');
    this.setHeaderTitle(this.rules.language.searchTitle);
  }

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

  showDetailsView() {
    this.closeSideContainer();
    this.transitionView(this.detailsContainer);
    this.backButton.style.display = 'inline';
    this.backButton.onclick = () => this.showResultsView();
    this.modalContent.classList.add('wide-view');
    this.setHeaderTitle(this.rules.language.detailsTitle);
  }

  showCreateIdentityView(mode) {
    this.hideInfoMessage();
    this.closeSideContainer();
    this.transitionView(this.createIdentityContainer);
    this.backButton.style.display = 'inline';
    this.backButton.onclick = () => this.showResultsView();
    this.modalContent.classList.add('wide-view');
    const headerTitle = mode === 'create' ? this.rules.language.createTitle : this.rules.language.modifyTitle;
    this.setHeaderTitle(headerTitle);
  }

  setHeaderTitle(title) {
    this.headerTitle.textContent = title;
  }

  transitionView(showElement) {
    [this.searchContainer, this.resultsContainer, this.detailsContainer, this.createIdentityContainer].forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active');
    });
    showElement.style.display = 'block';
    showElement.classList.add('active');
    this.adjustModalHeight();
  }

  adjustModalHeight() {
    this.modalContent.style.maxHeight = `${window.innerHeight * 0.9}px`;
    this.modalScrollableContent.forEach(el => {
      el.style.maxHeight = `${window.innerHeight * 0.9 - this.modalHeader.offsetHeight - this.modalFooter.offsetHeight}px`;
    });
  }

  showLoading(message = this.rules.language.loading) {
    this.closeSideContainer();
    this.scrollToTop();
    const loadingContainer = this.modal.querySelector('.ip-loading-container');
    const loadingMessage = loadingContainer.querySelector('.ip-loading-message') || this.createLoadingMessage();
    loadingMessage.textContent = message;
    loadingContainer.style.display = 'flex';
    void loadingContainer.offsetWidth;
    loadingContainer.classList.add('show');
  }

  hideInfoMessage() {
    this.infoMessage.style.display = 'none';
    this.infoMessage.innerHTML = '';
    this.adjustModalHeight();
  }

  createLoadingMessage() {
    this.hideInfoMessage();
    const messageElement = document.createElement('div');
    messageElement.className = 'ip-loading-message';
    const loadingContainer = this.modal.querySelector('.ip-loading-container');
    loadingContainer.appendChild(messageElement);
    return messageElement;
  }

  hideLoading() {
    this.scrollToTop();
    const loadingContainer = this.modal.querySelector('.ip-loading-container');
    loadingContainer.classList.remove('show');
    setTimeout(() => {
      loadingContainer.style.display = 'none';
    }, 300);
  }

  scrollToTop() {
    this.modalScrollableContent.forEach(el => {
      el.scrollTop = 0;
    });
  }

  openModal() {
    this.modal.style.display = 'flex';
    const hasSearchPermission = this.permissions.search;
    const hasViewPermission = this.permissions.view;
    const modalCuid = this.modal.getAttribute('data-cuid');
    if (!hasSearchPermission && !hasViewPermission) {
      this.showInfoMessage('noPermissions', 'error');
    } else if (hasViewPermission && modalCuid) {
      this.identityView.loadIdentityDetails(modalCuid);
    } else if (hasViewPermission && !modalCuid && !hasSearchPermission) {
      this.showInfoMessage('noCuid', 'error');
    } else {
      this.showSearchView();
    }
    document.body.classList.add('ip-body');
    requestAnimationFrame(() => {
      this.modal.classList.add('ip-modal-open');
      this.adjustModalHeight();
    });
  }

  closeModal() {
    this.modal.classList.remove('ip-modal-open');
    this.modal.classList.add('ip-modal-closing');
    setTimeout(() => {
      document.body.classList.remove('ip-body');
      this.modal.style.display = 'none';
      this.modal.classList.remove('ip-modal-closing');
    }, 300);
  }
}