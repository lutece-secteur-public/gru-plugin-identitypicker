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
    this.openButton = document.getElementById(`lutece-identitypicker-open-button-${uniqueId}`);
    this.init();
    this.identitySearch = new IdentitySearch(this);
    this.identityView = new IdentityView(this);
    this.identityForm = new IdentityForm(this);
    this.identityHistory = new IdentityHistory(this);
    this.rules = null;
  }

  async init() {
    await this.createModal();
    if (this.config.autoFill && this.config.cuid != null && this.config.cuid !== '') {
      setTimeout(() => this.identityView.autoFillIdentity(this.config.cuid), 0);
    }
    this.openButton.addEventListener('click', (event) => {
      event.preventDefault();
      this.openModal();
    });
    this.initSideContainer();
  }

  async createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'lutece-identitypicker-modal';
    if (this.config.cuid != null && this.config.cuid !== '') {
      this.modal.setAttribute('data-cuid', this.config.cuid);
    }
    this.modal.innerHTML = this.getModalHTML();
    document.body.appendChild(this.modal);

    this.modalContent = this.modal.querySelector('.lutece-identitypicker-modal-content');
    this.searchContainer = this.modal.querySelector('.lutece-identitypicker-search-container');
    this.resultsContainer = this.modal.querySelector('.lutece-identitypicker-results-container');
    this.detailsContainer = this.modal.querySelector('.lutece-identitypicker-details-container');
    this.historyContainer = this.modal.querySelector('.lutece-identitypicker-history-container');
    this.createIdentityContainer = this.modal.querySelector('.lutece-identitypicker-create-identity-container');
    this.backButton = this.modal.querySelector('.lutece-identitypicker-back');
    this.infoMessage = this.modal.querySelector('.lutece-identitypicker-info-message');
    this.contentArea = this.modal.querySelector('.lutece-identitypicker-content-area');
    this.headerTitle = this.modal.querySelector('.lutece-identitypicker-header h2');
    this.modalHeader = this.modal.querySelector('.lutece-identitypicker-header');
    this.modalFooter = this.modal.querySelector('.lutece-identitypicker-footer');
    this.modalScrollableContent = this.modal.querySelectorAll('.lutece-identitypicker-scrollable-content');
    await this.fetchRules();
    await this.fetchAndApplyPermissions();
    await this.identitySearch.initSearchView();
    this.modal.querySelector('.lutece-identitypicker-close').addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (event) => {
      if (event.target === this.modal) this.closeModal();
    });
    this.backButton.addEventListener('click', () => this.showSearchView());
  }

  getModalHTML() {
    return `
      <div class="lutece-identitypicker-modal-content">
        <div class="lutece-identitypicker-header">
          <div class="lutece-identitypicker-header-container">
            <span class="lutece-identitypicker-back" style="display: none;">&#8592;</span>
            <h2></h2>
            <button class="lutece-identitypicker-close lutece-identitypicker-button-light lutece-identitypicker-button-rounded">&times;</button>
          </div>
        </div>
        <div class="lutece-identitypicker-main-container">
          <div class="lutece-identitypicker-scrollable-content">
            <div class="lutece-identitypicker-content-area">
              <div class="lutece-identitypicker-info-message" style="display: none;"></div>
              <div class="lutece-identitypicker-search-container" style="display: none;"></div>
              <div class="lutece-identitypicker-results-container" style="display: none;"></div>
              <div class="lutece-identitypicker-details-container" style="display: none;"></div>
              <div class="lutece-identitypicker-create-identity-container" style="display: none;"></div>
              <div class="lutece-identitypicker-loading-container" style="display: none;">
                <div class="lutece-identitypicker-loader"></div>
                <div class="lutece-identitypicker-loading-message"></div>
              </div>
            </div>
          </div>
          <div class="lutece-identitypicker-side-container" style="display: none;">
            <div class="lutece-identitypicker-header">
                  <div class="lutece-identitypicker-header-container">
                    <h2></h2>
                    <button class="lutece-identitypicker-side-close lutece-identitypicker-button-light lutece-identitypicker-button-rounded">×</button>
                  </div>
                </div>
                 <div class="lutece-identitypicker-scrollable-content">
            <div class="lutece-identitypicker-content-area">
            </div>
            </div>
          </div>
        </div>
        <div class="lutece-identitypicker-footer" style="display:none"></div>
      </div>
    `;
  }

  async fetchRules() {
    const rulesUrl = this.config.endpoints.rules;
    try {
      const response = await fetch(rulesUrl);
      if (!response.ok) {
        throw new Error(`${this.rules.language.httpError} ${response.status}`);
      }
      this.rules = await response.json();
    } catch (error) {
      console.error(this.rules.language.fetchError, error);
      this.identityPicker.showInfoMessage('errorLoadingRules', 'error');
    }
  }

  async fetchAndApplyPermissions() {
    try {
      this.openButton.disabled = true;
      const response = await fetch('rest/identitystore/api/permissions');
      const permissions = await response.json();
      this.permissions = {
        search: this.config.search && permissions.SEARCH,
        creation: this.config.creation && permissions.CREATE,
        update: this.config.update && permissions.UPDATE,
        view: permissions.VIEW,
        create_task: this.config.create_task && permissions.CREATE_TASK
      };
      this.openButton.disabled = false;
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      this.openButton.textContent = this.rules.language.permissionsUnavailable;
      this.config = { ...this.config };
    }
  }

  initSideContainer() {
    this.sideContainer = this.modal.querySelector('.lutece-identitypicker-side-container');
    this.sideContent = this.sideContainer.querySelector('.lutece-identitypicker-content-area');
    this.sideCloseButton = this.sideContainer.querySelector('.lutece-identitypicker-side-close');

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
    const breakpoint = 1280; // Largeur d'écran à laquelle on bascule vers l'overlay

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
        <p class="lutece-identitypicker-info-message-main">${messageText}</p>
        ${description ? `<p class="lutece-identitypicker-info-message-description">${description}</p>` : ''}
        <span class="lutece-identitypicker-info-message-close">&times;</span>
    `;
    this.infoMessage.className = `lutece-identitypicker-info-message ${type}`;
    this.infoMessage.style.display = 'block';
    const closeButton = this.infoMessage.querySelector('.lutece-identitypicker-info-message-close');
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
    if (this.resultsContainer.querySelector('.lutece-identitypicker-results-list') && this.resultsContainer.querySelector('.lutece-identitypicker-results-list').children.length === 0) {
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
    const loadingContainer = this.modal.querySelector('.lutece-identitypicker-loading-container');
    const loadingMessage = loadingContainer.querySelector('.lutece-identitypicker-loading-message') || this.createLoadingMessage();
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
    messageElement.className = 'lutece-identitypicker-loading-message';
    const loadingContainer = this.modal.querySelector('.lutece-identitypicker-loading-container');
    loadingContainer.appendChild(messageElement);
    return messageElement;
  }

  hideLoading() {
    this.scrollToTop();
    const loadingContainer = this.modal.querySelector('.lutece-identitypicker-loading-container');
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
    requestAnimationFrame(() => {
      this.modal.classList.add('lutece-identitypicker-modal-open');
      this.adjustModalHeight();
    });
  }

  closeModal() {
    this.modal.classList.remove('lutece-identitypicker-modal-open');
    this.modal.classList.add('lutece-identitypicker-modal-closing');
    setTimeout(() => {
      this.modal.style.display = 'none';
      this.modal.classList.remove('lutece-identitypicker-modal-closing');
    }, 300);
  }
}