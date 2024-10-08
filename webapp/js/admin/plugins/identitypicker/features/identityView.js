import { getAttributeValue, formatDate } from '../utils/utils';

export default class IdentityView {
  constructor(identityPicker) {
    this.identityPicker = identityPicker;
  }

  async autoFillIdentity(customerId) {
    const url = `${this.identityPicker.config.endpoints.identity}/${customerId}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${this.identityPicker.rules.language.httpError} ${response.status}`);
      }
      const identityData = await response.json();
      this.fillFields(identityData);
    } catch (error) {
      console.error(this.identityPicker.rules.language.fetchError, error);
    } finally {
    }
  }

  async loadIdentityDetails(customerId) {
    this.identityPicker.showLoading();
    const identityUrl = `${this.identityPicker.config.endpoints.identity}/${customerId}`;
    try {
      const identityResponse = await fetch(identityUrl);
      if (!identityResponse.ok) {
        throw identityResponse;
      }
      const identityData = await identityResponse.json();
      this.displayIdentityDetails(identityData);
    } catch (error) {
      console.error(this.identityPicker.rules.language.fetchError, error);
      let errorMessage;
      if (error instanceof Response) {
        if (error.status === 403) {
          errorMessage = `${this.identityPicker.rules.language.httpError} 403`;
        } else {
          errorMessage = `${this.identityPicker.rules.language.httpError} ${error.status}`;
        }
      } else {
        errorMessage = error.message;
      }
  
      const messageType = errorMessage.includes('403') ? 'noPermissions' : 'errorMessage';
      this.identityPicker.showInfoMessage(messageType, 'error', errorMessage);
    } finally {
      this.identityPicker.hideLoading();
    }
  }

  displayIdentityDetails(identity) {
    const detailsContainer = this.identityPicker.detailsContainer;
    const firstName = getAttributeValue(identity, 'first_name');
    const lastName = getAttributeValue(identity, 'family_name');
    const preferredUsername = getAttributeValue(identity, 'preferred_username');

    const headerHTML = this.generateHeaderHTML(identity, firstName, lastName, preferredUsername);
    const tableHTML = this.generateAttributesTable(identity);

    detailsContainer.innerHTML = headerHTML + tableHTML;

    this.setupButtons(identity);
    this.identityPicker.showDetailsView();
  }

  generateHeaderHTML(identity, firstName, lastName, preferredUsername) {
    const isSelected = this.identityPicker.modal.getAttribute("data-cuid") !== identity.customer_id;
       const emailAttribute = identity.attributes.find(attr => attr.key === 'email');
       const hasValidEmail = emailAttribute && emailAttribute.value && emailAttribute.value.trim() !== '';
       const hasValidCertification = emailAttribute && emailAttribute.certProcess === 'DEC';
       const showValidateEmailButton = hasValidEmail && hasValidCertification && this.identityPicker.permissions.create_task;
       const showCreateAccountButton = this.canCreateAccount(identity) && this.identityPicker.permissions.create_task;

    return `
      <div class="ip-container-header">
        <div>
          <h3 class="ip-truncate">${firstName} ${lastName}${preferredUsername ? ` (${preferredUsername})` : ''}</h3>
          <p class="ip-truncate ip-description">${identity.customer_id}</p>
            ${showValidateEmailButton ? `<button class="ip-validate-email-btn ip-button-mini ip-button-yellow">⚠️ ${this.identityPicker.rules.language.validateEmailButton}</button>` : ''}
        </div>
      <div class="ip-container-header-btns">
        <button class="ip-history-btn">${this.identityPicker.rules.language.historyButton}</button>
        ${this.identityPicker.permissions.update ? `<button class="ip-modify-btn">${this.identityPicker.rules.language.modifyButton}</button>` : ''}
        ${Object.keys(this.identityPicker.config.fieldMapping || {}).length > 0 && this.identityPicker.config.selection ? `<button class="ip-select-btn" ${!isSelected ? 'disabled' : ''}>${!isSelected ? `${this.identityPicker.rules.language.selectedButton}` : `${this.identityPicker.rules.language.selectButton}`}</button>` : ''}
      </div>
      </div>
      <div class="ip-info-tags">
        <span class="ip-info-tag ip-tag-default">
          <strong>${this.identityPicker.rules.language.creationDate}</strong> ${formatDate(identity.creation_date)}
        </span>
        <span class="ip-info-tag ip-tag-default">
          <strong>${this.identityPicker.rules.language.lastUpdateDate}</strong> ${formatDate(identity.last_update_date)}
        </span>
        <span class="ip-info-tag ${identity.mon_paris_active ? 'ip-tag-success' : 'ip-tag-error'}">
          <strong>${this.identityPicker.rules.language.monParisAccount}</strong> ${identity.mon_paris_active ? this.identityPicker.rules.language.active : ` ${showCreateAccountButton ? `<button class="ip-create-account-btn ip-button-mini ip-button-red">${this.identityPicker.rules.language.createAccountButton}</button>` : this.identityPicker.rules.language.inactive}`}
        </span>
        <span class="ip-info-tag ${this.getCoverageClass(identity.quality.coverage)}">
          <strong>${this.identityPicker.rules.language.coverage}</strong> ${identity.quality.coverage === 1 ? this.identityPicker.rules.language.complete : this.identityPicker.rules.language.incomplete}
        </span>
      </div>`;
  }

  generateAttributesTable(identity) {
    const attributes = this.identityPicker.rules.contract.attributeDefinitions
      .filter(attr => attr.attributeRight.readable)
      .map(attr => {
        const identityAttr = identity.attributes.find(a => a.key === attr.keyName);
        return {
          name: attr.name,
          key: attr.keyName,
          value: identityAttr ? identityAttr.value : '',
          certification: identityAttr ? identityAttr.certProcess : ''
        };
      });

    const groupedAttributes = this.groupAttributes(attributes);

    let tableHTML = `
      <table class="ip-table">
        <tbody>`;

    for (const [groupKey, attrs] of Object.entries(groupedAttributes)) {
      if (attrs.length > 0) {
        const groupLabel = groupKey === 'other' ? this.identityPicker.rules.language.otherGroup : this.identityPicker.rules.language[`${groupKey}Group`];
        tableHTML += `
          <tr class="ip-group-separator">
            <td class="ip-table-separator" colspan="3">${groupLabel}</td>
          </tr>`;

        attrs.forEach(attr => {
          const certInfo = this.getCertificationInfo(attr.key, attr.certification);
          const displayValue = this.getDisplayValue(attr.key, attr.value);
          tableHTML += `
            <tr>
              <td>${attr.name}</td>
              <td><strong>${displayValue}</strong></td>
              <td>
                <span title="${certInfo.description}">${certInfo.label}</span>
              </td>
            </tr>`;
        });
      }
    }

    tableHTML += `
        </tbody>
      </table>`;

    return tableHTML;
  }

  canCreateAccount(identity) {
    if (identity.mon_paris_active) {
      return false;
    }
    const pivotAttributes = this.identityPicker.rules.referential.attributeKeyList.attributeKeys
    .filter(attr => attr.pivot)
    .map(attr => attr.keyName)
    .sort((a, b) => a.localeCompare(b));
    let birthcountryCode = null;
    for (const attrKey of pivotAttributes) {
      const attribute = identity.attributes.find(attr => attr.key === attrKey);
      if (attrKey === 'birthcountry_code' && attribute) {
        birthcountryCode = attribute.value;
      }
      if (attrKey === 'birthplace_code') {
        if (birthcountryCode && birthcountryCode !== '99100') {
          continue;
        }
      }
      if (!attribute || attribute.certProcess !== 'ORIG1') {
        return false;
      }
    }
    return true;
  }

  groupAttributes(attributes) {
    const groupedAttributes = {};
    Object.keys(this.identityPicker.attributeGroups).forEach(groupKey => {
      groupedAttributes[groupKey] = [];
    });
    groupedAttributes['other'] = [];

    attributes.forEach(attr => {
      let placed = false;
      for (const [groupKey, group] of Object.entries(this.identityPicker.attributeGroups)) {
        if (group.attributes.includes(attr.key)) {
          groupedAttributes[groupKey].push(attr);
          placed = true;
          break;
        }
      }
      if (!placed) {
        groupedAttributes['other'].push(attr);
      }
    });

    Object.keys(groupedAttributes).forEach(groupKey => {
      if (groupKey !== 'other') {
        groupedAttributes[groupKey].sort((a, b) => {
          return this.identityPicker.attributeGroups[groupKey].attributes.indexOf(a.key) -
            this.identityPicker.attributeGroups[groupKey].attributes.indexOf(b.key);
        });
      }
    });

    return groupedAttributes;
  }

  getAttributeInfo(key) {
    const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
    return {
      label: attributeKey ? attributeKey.name : key,
      description: attributeKey ? attributeKey.description : ''
    };
  }

  getCertificationInfo(attributeKey, certificationProcess) {
    const process = this.identityPicker.rules.referential.processList.processus.find(p => p.code === certificationProcess);
    if (process) {
      const attributeCertification = process.attributeCertificationLevels.find(acl => acl.attributeKey === attributeKey);
      if (attributeCertification) {
        return {
          label: process.label,
          description: attributeCertification.level.description
        };
      }
    }
    return {
      label: certificationProcess,
      description: this.identityPicker.rules.language.certificationUnavailable
    };
  }

  getCoverageClass(coverage) {
    if (coverage < 0.5) return 'ip-tag-error';
    if (coverage < 0.8) return 'ip-tag-warning';
    return 'ip-tag-success';
  }

  getDisplayValue(key, value) {
    const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
    if (attributeKey && attributeKey.values) {
      const matchingValue = attributeKey.values.find(v => v.value === value);
      return matchingValue ? matchingValue.label : value;
    }
    return value;
  }

  fillFields(identity) {
    for (const [fieldId, mapping] of Object.entries(this.identityPicker.config.fieldMapping)) {
      const field = document.getElementById(fieldId);
      if (field) {
        let value;
        if (mapping in identity) {
          value = identity[mapping];
        } else {
          const attribute = identity.attributes.find(attr => attr.key === mapping);
          value = attribute ? attribute.value : '';
        }

        if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
          field.value = value;
        } else {
          field.textContent = value;
        }
      }
    }
    this.identityPicker.modal.setAttribute('data-cuid', identity.customer_id);
    this.identityPicker.closeModal();
  }

  setupButtons(identity) {
    const detailsContainer = this.identityPicker.detailsContainer;
    const modifyButton = detailsContainer.querySelector('.ip-modify-btn');
    const selectButton = detailsContainer.querySelector('.ip-select-btn');
    const historyButton = detailsContainer.querySelector('.ip-history-btn');
    const createAccountButton = detailsContainer.querySelector('.ip-create-account-btn');
    const validateEmailButton = detailsContainer.querySelector('.ip-validate-email-btn');
  

    modifyButton?.addEventListener('click', () => {
      this.identityPicker.identityForm.showModifyIdentityForm(identity.customer_id);
    });

    selectButton?.addEventListener('click', () => {
      this.fillFields(identity);
    });

    historyButton?.addEventListener('click', () => {
      this.identityPicker.identityHistory.loadGlobalHistory(identity.customer_id);
    });

    createAccountButton?.addEventListener('click', () => {
      this.createIdentityTask(identity.customer_id, 'create-account-task');
    });
  
    validateEmailButton?.addEventListener('click', () => {
      this.createIdentityTask(identity.customer_id, 'validate-email-task');
    });


  }


  async createIdentityTask(customerId, taskType) {
    try {
      const url = `${this.identityPicker.config.endpoints.identity}/${customerId}/tasks/${taskType}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        let errorMessage = data.status && data.status.message
          ? data.status.message
          : this.identityPicker.rules.language.fetchError;
        this.identityPicker.showInfoMessage(
          this.identityPicker.rules.language.taskCreationFailed,
          'error',
          errorMessage
        );
        return;
      }
  
      const taskCode = data.task_code;
      const successTitle = this.identityPicker.rules.language.taskCreationSuccess;
      const description = `${this.identityPicker.rules.language.taskCode}: ${taskCode}`;
      this.identityPicker.showInfoMessage(successTitle, 'success', description);
    } catch (error) {
      console.error(this.identityPicker.rules.language.fetchError, error);
      let errorMessage;
  
      if (error instanceof Response) {
        try {
          const errorData = await error.json();
          errorMessage = errorData.status && errorData.status.message
            ? errorData.status.message
            : error.statusText || this.identityPicker.rules.language.fetchError;
        } catch (e) {
          errorMessage = error.statusText || this.identityPicker.rules.language.fetchError;
        }
      } else {
        errorMessage = error.message || this.identityPicker.rules.language.fetchError;
      }
  
      this.identityPicker.showInfoMessage(
        this.identityPicker.rules.language.taskCreationFailed,
        'error',
        errorMessage
      );
    }
  }
  
} 