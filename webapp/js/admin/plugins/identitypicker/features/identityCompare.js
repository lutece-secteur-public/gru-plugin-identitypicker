import { formatDate } from '../utils/utils';

export default class IdentityCompare {
    constructor(identityPicker) {
        this.identityPicker = identityPicker;
        this.identities = [];
    }

    initCompareView(identities) {
        this.identities = identities.sort((a, b) => {
            const qualityDiff = b.quality.scoring - a.quality.scoring;
            if (qualityDiff !== 0) return qualityDiff;
            
            return new Date(b.last_update_date) - new Date(a.last_update_date);
        });
        
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

        const tableHeaders = this.identities.map(identity => `
            <th>
                <a href="#" class="ip-select-link" data-customer-id="${identity.customer_id}">
                    ${identity.customer_id}
                </a>
            </th>
        `).join('');

        let tableRows = '';

        const referenceIdentity = this.identities[0];

        const certificationsRow = this.createCertificationsRow(referenceIdentity);
        
        const monParisRow = this.createMonParisRow();

        let identityInfoRows = this.createIdentityInfoRows();
        let contactInfoRows = this.createContactInfoRows();
        let additionalInfoRows = this.createAdditionalInfoRows();

        tableRows = 
            `<tr class="ip-group-separator">
                <td class="ip-table-separator ip-group-label">Informations d'identité</td>
                ${Array(this.identities.length).fill(`<td class="ip-table-separator"></td>`).join('')}
            </tr>` +
            certificationsRow +
            monParisRow +
            identityInfoRows +
            `<tr class="ip-group-separator">
                <td class="ip-table-separator ip-group-label">Informations de contact</td>
                ${Array(this.identities.length).fill(`<td class="ip-table-separator"></td>`).join('')}
            </tr>` +
            contactInfoRows +
            `<tr class="ip-group-separator">
                <td class="ip-table-separator ip-group-label">Informations complémentaires</td>
                ${Array(this.identities.length).fill(`<td class="ip-table-separator"></td>`).join('')}
            </tr>` +
            additionalInfoRows;

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

    createCertificationsRow(referenceIdentity) {
        const pivotAttributes = this.identityPicker.rules.referential.attributeKeyList.attributeKeys
            .filter(attr => attr.pivot)
            .map(attr => attr.keyName);
        
        const certificationTexts = this.identities.map(identity => {
            let allCertified = true;
            let minCertLevel = 600;
            
            for (const pivotAttr of pivotAttributes) {
                const attr = identity.attributes.find(a => a.key === pivotAttr);
                if (!attr) {
                    allCertified = false;
                    break;
                }
                
                const certCode = attr.certProcess;
                const certDef = this.identityPicker.rules.contract.attributeDefinitions
                    .find(def => def.keyName === pivotAttr)?.attributeCertifications
                    .find(cert => cert.code === certCode);
                
                if (!certDef || parseInt(certDef.level) < 400) {
                    allCertified = false;
                    break;
                }
                
                minCertLevel = Math.min(minCertLevel, parseInt(certDef.level));
            }
            
            if (!allCertified) return "";
            
            if (minCertLevel >= 600) return "FranceConnect";
            if (minCertLevel >= 500) return "PJ officielle guichet";
            if (minCertLevel >= 400) return "PJ officielle scannée";
            
            return "";
        });
        
        if (certificationTexts.every(text => text === "")) {
            return "";
        }
        
        const cells = certificationTexts.map(text => `<td>${text}</td>`).join('');
        return `<tr>
            <td>${this.identityPicker.rules.language.certificationLevel || "Niveau de certification"}</td>
            ${cells}
        </tr>`;
    }

    createMonParisRow() {
        const cells = this.identities.map(identity => {
            const isActive = identity.mon_paris_active;
            const text = isActive 
                ? this.identityPicker.rules.language.active || "Oui" 
                : this.identityPicker.rules.language.inactive || "Non";
            const className = isActive ? 'ip-active' : 'ip-inactive';
            return `<td class="${className}">${text}</td>`;
        }).join('');

        return `<tr>
            <td>${this.identityPicker.rules.language.monParisAccount || "Identité rattachée à un compte MonParis"}</td>
            ${cells}
        </tr>`;
    }

    createIdentityInfoRows() {
        const identityAttributes = [
            { key: 'gender', label: this.identityPicker.rules.language.gender || "Sexe", formatter: this.formatGender.bind(this) },
            { key: 'family_name', label: this.identityPicker.rules.language.familyName || "Nom de naissance", formatter: value => value.toUpperCase() },
            { key: 'preferred_username', label: this.identityPicker.rules.language.preferredUsername || "Nom d'usage", formatter: value => `<i>${value.toUpperCase()}</i>` },
            { key: 'first_name', label: this.identityPicker.rules.language.firstName || "Prénoms", formatter: this.formatFirstName.bind(this) },
            { key: 'birthdate', label: this.identityPicker.rules.language.birthdate || "Date de naissance" },
            { key: 'birthcountry', label: this.identityPicker.rules.language.birthcountry || "Pays de naissance" },
            { key: 'birthcountry_code', label: this.identityPicker.rules.language.birthcountryCode || "Code INSEE pays" },
            { key: 'birthplace', label: this.identityPicker.rules.language.birthplace || "Commune de naissance" },
            { key: 'birthplace_code', label: this.identityPicker.rules.language.birthplaceCode || "Code INSEE commune" }
        ];

        return this.createAttributeRows(identityAttributes);
    }

    createContactInfoRows() {
        const contactAttributes = [
            { key: 'email', label: this.identityPicker.rules.language.email || "Email de contact" },
            { key: 'login', label: this.identityPicker.rules.language.login || "Login" },
            { key: 'mobile_phone', label: this.identityPicker.rules.language.mobilePhone || "Téléphone portable" },
            { key: 'fixed_phone', label: this.identityPicker.rules.language.fixedPhone || "Téléphone fixe" },
            { key: 'address', label: this.identityPicker.rules.language.address || "Adresse" },
            { key: 'address_detail', label: this.identityPicker.rules.language.addressDetail || "Complément d'adresse" },
            { key: 'address_postal_code', label: this.identityPicker.rules.language.postalCode || "Code postal" },
            { key: 'address_city', label: this.identityPicker.rules.language.city || "Ville" }
        ];

        return this.createAttributeRows(contactAttributes);
    }

    createAdditionalInfoRows() {
        let rows = '';
        
        rows += this.createRow(
            this.identityPicker.rules.language.creationDate || "Date de Création",
            this.identities.map(identity => formatDate(identity.creation_date))
        );
        
        rows += this.createRow(
            this.identityPicker.rules.language.lastUpdateDate || "Date de Modification",
            this.identities.map(identity => formatDate(identity.last_update_date))
        );
        
        rows += this.createRow(
            this.identityPicker.rules.language.qualityScore || "Score",
            this.identities.map(identity => {
                const scoringValue = (identity.quality.scoring * 100).toFixed(2);
                const className = this.getPercentageClass(scoringValue);
                return { value: `${scoringValue}%`, className };
            })
        );
        
        rows += this.createRow(
            this.identityPicker.rules.language.coverageLabel || "Couverture",
            this.identities.map(identity => {
                const coverageValue = (identity.quality.coverage * 100).toFixed(2);
                const className = this.getPercentageClass(coverageValue);
                const displayText = coverageValue >= 100 
                    ? (this.identityPicker.rules.language.completeInformation || "Informations Complètes")
                    : (this.identityPicker.rules.language.incompleteInformation || "Informations à compléter");
                return { value: displayText, className };
            })
        );
        
        rows += this.createRow(
            this.identityPicker.rules.language.qualityLabel || "Qualité",
            this.identities.map(identity => {
                const qualityValue = (identity.quality.quality * 100).toFixed(2);
                const className = this.getPercentageClass(qualityValue);
                return { value: `${qualityValue}%`, className };
            })
        );
        
        return rows;
    }

    createAttributeRows(attributeDefinitions) {
        let rows = '';
        const referenceIdentity = this.identities[0];
        
        attributeDefinitions.forEach(attrDef => {
            const referenceValue = this.getAttrValue(referenceIdentity, attrDef.key);
            
            const cells = this.identities.map((identity, index) => {
                let value = this.getAttrValue(identity, attrDef.key);
                
                if (attrDef.formatter && value) {
                    value = attrDef.formatter(value);
                }
                
                if (index > 0 && this.normalizeString(value) !== this.normalizeString(referenceValue)) {
                    return `<td class="ip-difference">${value || ''}</td>`;
                }
                
                return `<td>${value || ''}</td>`;
            }).join('');
            
            rows += `<tr>
                <td>${attrDef.label}</td>
                ${cells}
            </tr>`;
        });
        
        return rows;
    }

    createRow(label, values) {
        const cells = Array.isArray(values) 
            ? values.map(val => {
                if (typeof val === 'object') {
                    return `<td class="${val.className || ''}">${val.value || ''}</td>`;
                }
                return `<td>${val || ''}</td>`;
            }).join('')
            : Array(this.identities.length).fill(`<td>${values || ''}</td>`).join('');

        return `<tr>
            <td>${label}</td>
            ${cells}
        </tr>`;
    }

    formatGender(value) {
        if (value === '1') return 'F';
        if (value === '2') return 'H';
        return 'ND';
    }

    formatFirstName(firstName) {
        if (!firstName) return '';
        return firstName.split(' ')
            .map(name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())
            .join(' ');
    }

    getAttrValue(identity, key) {
        const attr = identity.attributes.find(a => a.key === key);
        return attr ? this.getDisplayValue(key, attr.value) : '';
    }

    getDisplayValue(key, value) {
        if (!value) return '';
        
        const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
        if (attributeKey && attributeKey.values) {
            const matchingValue = attributeKey.values.find(v => v.value === value);
            return matchingValue ? matchingValue.label : value;
        }
        return value;
    }

    normalizeString(str) {
        if (!str) return '';
        
        if (str.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = str;
            str = tempDiv.textContent || tempDiv.innerText || '';
        }
        
        return str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
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

    getAttributeInfo(key) {
        const attributeKey = this.identityPicker.rules.referential.attributeKeyList.attributeKeys.find(attr => attr.keyName === key);
        return {
            label: attributeKey ? attributeKey.name : key,
            description: attributeKey ? attributeKey.description : '',
        };
    }
}