import { formatDate } from '../utils/utils';

export default class IdentitySearch {
  constructor(identityPicker) {
    this.identityPicker = identityPicker;
    this.uniqueId = identityPicker.uniqueId;
    this.emailForm = null;
    this.nameForm = null;
  }

  async initSearchView() {
    const searchContainer = this.identityPicker.searchContainer;
    const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: -2px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

    searchContainer.innerHTML = `
      <div class="ip-search-option">
        <label>
          <input type="radio" name="searchType" value="email">
          <span>${this.identityPicker.rules.language.searchByEmail}</span>
        </label>
        <label>
          <input type="radio" name="searchType" value="name" checked>
          <span>${this.identityPicker.rules.language.searchByName}</span>
        </label>
      </div>
      <form id="ip-email-form-${this.uniqueId}" style="display: none;">
        <input type="email" placeholder="${this.identityPicker.rules.language.emailPlaceholder}" name="email" required>
        <div class="ip-container-buttons">
          <button class="ip-button-light" type="button">${this.identityPicker.rules.language.closeButton}</button>
          <button type="submit">${searchIcon} ${this.identityPicker.rules.language.searchButton}</button>
        </div>
      </form>
      <form id="ip-name-form-${this.uniqueId}">
        <input type="text" placeholder="${this.identityPicker.rules.language.firstNamePlaceholder}" name="firstName" required>
        <input type="text" placeholder="${this.identityPicker.rules.language.lastNamePlaceholder}" name="lastName" required>
        <input type="date" placeholder="${this.identityPicker.rules.language.birthdatePlaceholder}" name="birthdate" required>
        <div class="ip-container-buttons">
          <button class="ip-button-light ip-button-close" type="button">${this.identityPicker.rules.language.closeButton}</button>
          <button type="submit">${searchIcon} ${this.identityPicker.rules.language.searchButton}</button>
        </div>
      </form>
    `;

    this.emailForm = searchContainer.querySelector(`#ip-email-form-${this.uniqueId}`);
    this.nameForm = searchContainer.querySelector(`#ip-name-form-${this.uniqueId}`);
    this.closeBtn = searchContainer.querySelector('.ip-button-close');
    await this.setupSearchForms();
    await this.setupResultsClickHandler();
  }

  async setupSearchForms() {
    const searchContainer = this.identityPicker.searchContainer;
    searchContainer.querySelectorAll('input[name="searchType"]').forEach(radio => {
      radio.addEventListener('change', () => this.toggleSearchForm(radio.value));
    });

    this.emailForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.performSearch(new FormData(this.emailForm), 'email');
    });

    this.nameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.performSearch(new FormData(this.nameForm), 'name');
    });

    this.closeBtn.addEventListener('click', () => this.identityPicker.closeModal());



  }

  toggleSearchForm(searchType) {
    this.emailForm.style.display = searchType === 'email' ? 'block' : 'none';
    this.nameForm.style.display = searchType === 'name' ? 'block' : 'none';
    this.identityPicker.adjustModalHeight();
  }

  async performSearch(formData, searchType) {
  this.identityPicker.showLoading(this.identityPicker.rules.language.loading);
  const url = this.buildSearchUrl(formData, searchType);
  try {
    const response = await fetch(url);
    if (response.status === 404) {
      this.identityPicker.showInfoMessage('noResults', 'info');
      return;
    }
    if (!response.ok) throw new Error(`${this.identityPicker.rules.language.httpError} ${response.status}`);
    const data = await response.json();
    this.displayResults(data);
  } catch (error) {
    console.error(this.identityPicker.rules.language.fetchError, error);
    this.identityPicker.showInfoMessage('errorMessage', 'error', error.message);
  } finally {
    this.identityPicker.hideLoading();
  }
}

  buildSearchUrl(formData, searchType) {
    const baseUrl = this.identityPicker.config.endpoints.search + '?';
    if (searchType === 'email') {
      return `${baseUrl}email=${encodeURIComponent(formData.get('email'))}`;
    } else {
      const birthdate = formatDate(formData.get('birthdate'));
      return `${baseUrl}common_lastname=${formData.get('lastName')}&first_name=${formData.get('firstName')}&birthdate=${birthdate}`;
    }
  }

  displayResults(results) {
    const resultsContainer = this.identityPicker.resultsContainer;
    if (results.length === 0) {
      this.identityPicker.showInfoMessage('noResults', 'info');
      this.addCreateIdentityButton();
      return;
    }

    const resultsHtml = results.map(result => this.createResultItem(result)).join('');
    resultsContainer.innerHTML = `<ul class="ip-results-list">${resultsHtml}</ul>`;
    this.addCreateIdentityButton();
    this.identityPicker.showResultsView();
    this.identityPicker.adjustModalHeight();
  }

  createResultItem(result) {
    const searchData = this.getSearchData();
    const firstName = this.getAttributeValue(result, 'first_name');
    const lastName = this.getAttributeValue(result, 'family_name');
    const preferredUsername = this.getAttributeValue(result, 'preferred_username');
    const birthdate = this.getAttributeValue(result, 'birthdate');
    const address = this.getAttributeValue(result, 'address');
    const postalCode = this.getAttributeValue(result, 'address_postal_code');
    const city = this.getAttributeValue(result, 'address_city');

    const highlightedFirstName = this.highlightDifferences(searchData.firstName, firstName);
    const highlightedLastName = this.highlightLastNameDifferences(searchData.lastName, lastName, preferredUsername);
    const highlightedBirthdate = this.highlightDifferences(formatDate(searchData.birthdate), birthdate);

    const nameDisplay = `${highlightedFirstName} ${highlightedLastName}`;
    const detailsParts = [
      highlightedBirthdate,
      [address, postalCode, city].filter(Boolean).join(', ')
    ].filter(Boolean);
    const detailsDisplay = detailsParts.join(' | ');

    const quality = result.quality;
    const scoringPercentage = (quality.scoring * 100).toFixed(2);
    const qualityPercentage = (quality.quality * 100).toFixed(2);
    const coveragePercentage = (quality.coverage * 100).toFixed(2);

    const qualityStats = `
      <span class="ip-info-tag ${this.getBadgeColorClass(parseFloat(scoringPercentage))}">
        <strong>${this.identityPicker.rules.language.qualityScore}</strong> ${scoringPercentage}%
      </span>
    `;

    return `
      <li class="ip-result-item" data-customer-id="${result.customer_id}">
        <div class="ip-result-left">
          <div class="ip-result-header">
            <h3>${nameDisplay}</h3>
          </div>
          <div class="ip-result-details">
            <p>${detailsDisplay}</p>
            <p>
              ${this.identityPicker.rules.language.qualityLabel}: <span class="${this.getColorClass(parseFloat(qualityPercentage))}">${qualityPercentage}%</span> |
              ${this.identityPicker.rules.language.coverageLabel}: <span class="${this.getColorClass(parseFloat(coveragePercentage))}">${ coveragePercentage < 100 ? `${this.identityPicker.rules.language.incomplete}` : `${this.identityPicker.rules.language.complete}`}</span>
            </p>
          </div>
        </div>
        <div class="ip-result-right">
          ${qualityStats}
        </div>
      </li>
    `;
  }

  addCreateIdentityButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('ip-container-buttons');

    const newSearchButton = document.createElement('button');
    newSearchButton.textContent = this.identityPicker.rules.language.backButton;
    newSearchButton.classList.add('ip-button-light');
    newSearchButton.addEventListener('click', () => this.identityPicker.showSearchView());

    const createButton = document.createElement('button');
    createButton.textContent = this.identityPicker.rules.language.createButton;
    createButton.classList.add('ip-create-button');
    createButton.addEventListener('click', () => this.identityPicker.identityForm.showCreateIdentityForm());

    buttonContainer.appendChild(newSearchButton);
    buttonContainer.appendChild(createButton);
    this.identityPicker.resultsContainer.appendChild(buttonContainer);
  }

  getAttributeValue(result, key) {
    const attribute = result.attributes.find(attr => attr.key === key);
    return attribute ? attribute.value : '';
  }

  async setupResultsClickHandler() {
    this.identityPicker.resultsContainer.addEventListener('click', (event) => {
      const resultItem = event.target.closest('.ip-result-item');
      if (resultItem) {
        const customerId = resultItem.dataset.customerId;
        this.identityPicker.identityView.loadIdentityDetails(customerId);
      }
    });
  }

  getBadgeColorClass(percentage) {
    if (percentage >= 80) return 'ip-tag-success';
    if (percentage >= 50) return 'ip-tag-warning';
    return 'ip-tag-error';
  }

  getColorClass(percentage) {
    if (percentage >= 80) return 'ip-high';
    if (percentage >= 50) return 'ip-medium';
    return 'ip-low';
  }

  getSearchData() {
    const nameForm = document.getElementById(`ip-name-form-${this.uniqueId}`);
    return {
      firstName: nameForm.querySelector('input[name="firstName"]').value,
      lastName: nameForm.querySelector('input[name="lastName"]').value,
      birthdate: nameForm.querySelector('input[name="birthdate"]').value,
    };
  }

  removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  highlightDifferences(search, result) {
    if (!search || !result) return result;
    
    let searchNormalized = this.removeAccents(search.toLowerCase());
    let resultNormalized = this.removeAccents(result.toLowerCase());
    let highlightedResult = '';
    let searchIndex = 0;
    let inHighlight = false;

    for (let i = 0; i < result.length; i++) {
      if (searchIndex < searchNormalized.length && 
          resultNormalized[i] === searchNormalized[searchIndex]) {
        if (inHighlight) {
          highlightedResult += '</span>';
          inHighlight = false;
        }
        highlightedResult += result[i];
        searchIndex++;
      } else {
        if (!inHighlight) {
          highlightedResult += '<span class="ip-highlight">';
          inHighlight = true;
        }
        highlightedResult += result[i];
      }
    }

    if (inHighlight) {
      highlightedResult += '</span>';
    }

    return highlightedResult;
  }

  highlightLastNameDifferences(search, lastName, preferredUsername) {
    const lastNameMatch = this.highlightDifferences(search, lastName);
    const preferredUsernameMatch = preferredUsername ? this.highlightDifferences(search, preferredUsername) : '';

    if (!preferredUsername) return lastNameMatch;

    const lastNameDiffCount = (lastNameMatch.match(/<span class="ip-highlight">/g) || []).length;
    const preferredUsernameDiffCount = (preferredUsernameMatch.match(/<span class="ip-highlight">/g) || []).length;

    if (lastNameDiffCount <= preferredUsernameDiffCount) {
      return `${lastNameMatch} <span class="ip-preferred-name">(${preferredUsername})</span>`;
    } else {
      return `${lastName} <span class="ip-preferred-name">(${preferredUsernameMatch})</span>`;
    }
  }

}