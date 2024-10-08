import { formatDate } from '../utils/utils';
export default class IdentityCompare {
  constructor(identityPicker) {
    this.identityPicker = identityPicker;
    this.identities = [];
  }
  initCompareView(identities) {
    this.identities = identities;
    this.renderCompareTable();
  }
  renderCompareTable() {
    const width = window.innerWidth;
    const idealWidth = 200 + (300 * this.identities.length);
    if (idealWidth > width) {
      this.identityPicker.modalContent.style.maxWidth = `${width - 50}px`;
    } else {
      this.identityPicker.modalContent.style.maxWidth = `${idealWidth}px`;
    }
    const allAttributes = this.getAllAttributes();
    const groupedAttributes = this.groupAttributes(allAttributes);
    const tableHeaders = this.identities.map(identity => `
      <th>
        <a href="#" class="ip-select-link" data-customer-id="${identity.customer_id}">
          ${this.getAttrValue(identity, "first_name")} ${this.getAttrValue(identity, "family_name")}
        </a>
      </th>
    `).join('');
    let tableRows = '';
    const identityProperties = [
      { key: 'customer_id', label: this.identityPicker.rules.language.cuid },
      { key: 'creation_date', label: this.identityPicker.rules.language.creationDate },
      { key: 'last_update_date', label: this.identityPicker.rules.language.lastUpdateDate },
      { key: 'scoring', label: this.identityPicker.rules.language.qualityScore },
      { key: 'quality', label: this.identityPicker.rules.language.qualityLabel },
      { key: 'coverage', label: this.identityPicker.rules.language.coverageLabel },
      { key: 'mon_paris_active', label: this.identityPicker.rules.language.monParisAccount },
    ];
    identityProperties.forEach(prop => {
      tableRows += this.createIdentityPropertyRow(prop.key, prop.label);
    });
    for (const [groupKey, attrs] of Object.entries(groupedAttributes)) {
      if (attrs.length > 0) {
        const groupLabel = groupKey === 'other' ?
          this.identityPicker.rules.language.otherGroup :
          this.identityPicker.rules.language[`${groupKey}Group`];
        tableRows += `
          <tr class="ip-group-separator">
            <td class="ip-table-separator ip-group-label">${groupLabel}</td>
            ${Array(this.identities.length).fill(`<td class="ip-table-separator"></td>`).join('')}
          </tr>
        `;
        attrs.forEach(attr => {
          tableRows += this.createAttributeRow(attr.key);
        });
      }
    }
    const tableHtml = `
      <div class="ip-scrollable-content ip-compare-table-container">
        <table class="ip-compare-table">
          <thead>
            <tr>
              <th></th>
              ${tableHeaders}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
    this.identityPicker.compareContainer.innerHTML = tableHtml;
    this.identityPicker.compareContainer.scrollTop = 0;
    this.identityPicker.adjustModalHeight();
    const selectLinks = this.identityPicker.compareContainer.querySelectorAll('.ip-select-link');
    selectLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const customerId = link.dataset.customerId;
        this.identityPicker.showDetailsView(customerId, "compare");
      });
    });
  }
  createIdentityPropertyRow(propertyKey, propertyLabel) {
    const values = this.identities.map(identity => {
      let value = '';
      let className = '';
      switch (propertyKey) {
        case 'customer_id':
          value = identity.customer_id;
          break;
        case 'last_update_date':
          value = formatDate(identity.last_update_date);
          break;
        case 'creation_date':
          value = formatDate(identity.creation_date);
          break;
        case 'scoring':
          const scoringValue = (identity.quality.scoring * 100).toFixed(2);
          value = `${scoringValue}%`;
          className = this.getPercentageClass(scoringValue);
          break;
        case 'quality':
          const qualityValue = (identity.quality.quality * 100).toFixed(2);
          value = `${qualityValue}%`;
          className = this.getPercentageClass(qualityValue);
          break;
        case 'coverage':
          const coverageValue = (identity.quality.coverage * 100).toFixed(2);
          value = `${coverageValue}%`;
          className = this.getPercentageClass(coverageValue);
          break;
        case 'mon_paris_active':
          const isActive = identity.mon_paris_active;
          value = isActive ? this.identityPicker.rules.language.active : this.identityPicker.rules.language.inactive;
          className = isActive ? 'ip-active' : 'ip-inactive';
          break;
        default:
          value = identity[propertyKey] || '';
      }
      return { value, className };
    });
    const cells = values.map(valObj => `<td class="${valObj.className}">${valObj.value}</td>`).join('');
    return `<tr>
      <td>${propertyLabel}</td>
      ${cells}
    </tr>`;
  }
  getPercentageClass(percentage) {
    const percentValue = parseFloat(percentage);
    if (percentValue >= 80) return 'ip-percentage-high';
    if (percentValue >= 50) return 'ip-percentage-medium';
    return 'ip-percentage-low';
  }
  getAllAttributes() {
    const attributesMap = new Map();
    this.identities.forEach(identity => {
      identity.attributes.forEach(attr => {
        if (!attributesMap.has(attr.key)) {
          const attributeInfo = this.getAttributeInfo(attr.key);
          attributesMap.set(attr.key, {
            key: attr.key,
            label: attributeInfo.label,
            description: attributeInfo.description,
          });
        }
      });
    });
    return Array.from(attributesMap.values());
  }
  groupAttributes(attributes) {
    const groupedAttributes = {};
    Object.keys(this.identityPicker.config.attributeGroups).forEach(groupKey => {
      groupedAttributes[groupKey] = [];
    });
    groupedAttributes['other'] = [];
    attributes.forEach(attr => {
      let placed = false;
      for (const [groupKey, group] of Object.entries(this.identityPicker.config.attributeGroups)) {
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
          return this.identityPicker.config.attributeGroups[groupKey].attributes.indexOf(a.key) -
            this.identityPicker.config.attributeGroups[groupKey].attributes.indexOf(b.key);
        });
      }
    });
    return groupedAttributes;
  }
  createAttributeRow(attrKey) {
    const attributeInfo = this.getAttributeInfo(attrKey);
    const values = this.identities.map(identity => {
      return this.getAttrValue(identity, attrKey);
    });
    const normalizedValues = values.map(value => this.normalizeString(value));
    const commonParts = this.findCommonParts(normalizedValues);
    const cells = values.map((value, index) => {
      const highlightedValue = this.highlightDifferences(value, commonParts);
      return `<td>${highlightedValue}</td>`;
    }).join('');
    return `<tr>
      <td>${attributeInfo.label}</td>
      ${cells}
    </tr>`;
  }
  getAttrValue(identity, key) {
    const attr = identity.attributes.find(a => a.key === key);
    return attr ? this.getDisplayValue(key, attr.value) : '';
  }
  normalizeString(str) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  findCommonParts(values) {
    const nonEmptyValues = values.filter(value => value.trim() !== '');
    if (nonEmptyValues.length === 0) return [];
    const wordCount = {};
    nonEmptyValues.forEach(value => {
      const words = value.split(/\s+/);
      const uniqueWords = new Set(words);
      uniqueWords.forEach(word => {
        if (word.trim() === '') return;
        if (wordCount[word]) {
          wordCount[word]++;
        } else {
          wordCount[word] = 1;
        }
      });
    });
    const majorityThreshold = Math.floor(nonEmptyValues.length / 2) + 1;
    const commonWords = [];
    for (const word in wordCount) {
      if (wordCount[word] >= majorityThreshold) {
        commonWords.push(word);
      }
    }
    return commonWords;
  }
  highlightDifferences(originalValue, commonParts) {
    const words = originalValue.split(/\s+/);
    const highlightedWords = words.map(word => {
      const normalizedWord = this.normalizeString(word);
      if (commonParts.includes(normalizedWord)) {
        return word;
      } else if (word.trim() === '') {
        return word;
      } else {
        return `<span class="ip-difference">${word}</span>`;
      }
    });
    return highlightedWords.join(' ');
  }
  getAttributeInfo(key) {
    const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
    return {
      label: attributeKey ? attributeKey.name : key,
      description: attributeKey ? attributeKey.description : '',
    };
  }
  getDisplayValue(key, value) {
    const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
    if (attributeKey && attributeKey.values) {
      const matchingValue = attributeKey.values.find(v => v.value === value);
      return matchingValue ? matchingValue.label : value;
    }
    return value;
  }
}