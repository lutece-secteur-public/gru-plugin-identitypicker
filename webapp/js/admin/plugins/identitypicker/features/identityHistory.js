import Fuse from 'fuse.js';
import { getAttributeInfo } from '../utils/utils';

export default class IdentityHistory {
    constructor(identityPicker) {
        this.identityPicker = identityPicker;
        this.globalHistory = [];
        this.fuse = null;
    }

    async loadGlobalHistory(customerId) {
        this.identityPicker.showLoading(this.identityPicker.rules.language.loadingHistory);
        try {
            const [identityHistory, tasksData] = await Promise.all([
                this.fetchIdentityHistory(customerId),
                this.fetchIdentityTasks(customerId)
            ]);
            this.globalHistory = this.mergeHistoryData(identityHistory, tasksData);
            this.initFuseSearch();
            this.displayGlobalHistory(this.globalHistory);
        } catch (error) {
            console.error(this.identityPicker.rules.language.fetchError, error);
            this.identityPicker.showInfoMessage('errorLoadingHistory', 'error');
        } finally {
            this.identityPicker.hideLoading();
        }
    }

    async fetchIdentityHistory(customerId) {
        const url = `${this.identityPicker.config.endpoints.identity}/${customerId}/${this.identityPicker.config.endpoints.history}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`${this.identityPicker.rules.language.httpError} ${response.status}`);
        }
        return response.json();
    }

    async fetchIdentityTasks(customerId) {
        const url = `${this.identityPicker.config.endpoints.identity}/${customerId}/${this.identityPicker.config.endpoints.tasks}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`${this.identityPicker.rules.language.httpError} ${response.status}`);
        }
        return response.json();
    }

    mergeHistoryData(identityHistory, tasksData) {
        const allEvents = [];
        const language = this.identityPicker.rules.language;

        identityHistory.identity_changes.forEach(change => {
            const changeTypeText = language.history[change.changeType.toLowerCase()]?.[change.changeStatus.toLowerCase()] || '';
            const authorName = change.author?.author_name || language.unknown;
            const changeMessage = change.changeMessage || '';
            const formattedDate = this.formatDate(parseInt(change.modificationDate));

            allEvents.push({
                date: new Date(parseInt(change.modificationDate)),
                type: 'identity',
                data: change,
                changeTypeText,
                authorName,
                changeMessage,
                searchableText: `${formattedDate} ${changeTypeText} ${authorName} ${changeMessage}`
            });
        });

        identityHistory.attribute_histories.forEach(attrHistory => {
            const attributeInfo = getAttributeInfo(attrHistory.attribute_key, this.identityPicker.rules.referential);
            const attributeLabel = attributeInfo?.label || '';

            attrHistory.attribute_changes.forEach(change => {
                const attributeValue = change.attribute_value || '';
                const attributeChangeType = language.attributeChangeType || '';
                const formattedDate = this.formatDate(parseInt(change.modification_date));

                allEvents.push({
                    date: new Date(parseInt(change.modification_date)),
                    type: 'attribute',
                    data: {
                        ...change,
                        attribute_key: attrHistory.attribute_key
                    },
                    attributeLabel,
                    attributeValue,
                    attributeChangeType,
                    searchableText: `${formattedDate} ${attributeLabel} ${attributeValue} ${attributeChangeType}`
                });
            });
        });

        tasksData.forEach(task => {
            task.task_history.forEach(change => {
                const taskLanguage = language.tasks;
                const taskTypeText = this.getTaskTypeText(task.task_type, taskLanguage);
                const changeTypeText = this.getTaskChangeTypeText(task.task_type, change.task_change_type, change.task_status, taskLanguage);
                const statusText = this.getTaskStatusText(task.task_type, change.task_status, taskLanguage);
                const authorName = change.request_author?.author_name || language.unknown;
                const metadataText = Object.values(task.metadata || {}).join(' ');
                const formattedDate = this.formatDate(parseInt(change.task_change_date));
                allEvents.push({
                    date: new Date(parseInt(change.task_change_date)),
                    type: 'task',
                    data: { task, change },
                    taskTypeText,
                    changeTypeText,
                    statusText,
                    authorName,
                    metadataText,
                    taskCode: task.task_code,
                    searchableText: `${formattedDate} ${taskTypeText} ${changeTypeText} ${statusText} ${authorName} ${metadataText}`
                });
            });
        });

        allEvents.sort((a, b) => b.date - a.date);

        return allEvents;
    }

    getTaskTypeText(taskType, languageTasks) {
        const key = taskType.toLowerCase();
        return languageTasks[key]?.label || taskType;
    }

    getTaskChangeTypeText(taskType, changeType, status, languageTasks) {
        const taskKey = taskType.toLowerCase();
        const changeKey = changeType.toLowerCase();
        const statusKey = status.toLowerCase();
        return languageTasks[taskKey]?.[changeKey]?.[statusKey] || `${taskType} ${changeType} ${status}`;
    }

    getTaskStatusText(taskType, status, languageTasks) {
        const taskKey = taskType.toLowerCase();
        const statusKey = status.toLowerCase();
        return languageTasks[taskKey]?.status?.[statusKey] || status;
    }

    initFuseSearch() {
        const options = {
            includeScore: true,
            threshold: 0.3,
            useExtendedSearch: true,
            keys: [
                'type',
                'changeTypeText',
                'authorName',
                'changeMessage',
                'attributeLabel',
                'attributeValue',
                'taskTypeText',
                'statusText',
                'metadataText',
                'taskCode',
                'searchableText'
            ]
        };

        this.fuse = new Fuse(this.globalHistory, options);
    }

    searchHistory(query) {
        if (!query) {
            return this.globalHistory;
        }

        const queryWords = query.split(' ').filter(Boolean);

        const searchPattern = {
            $and: queryWords.map(word => ({
                $or: [
                    { 'type': word },
                    { 'changeTypeText': word },
                    { 'authorName': word },
                    { 'changeMessage': word },
                    { 'attributeLabel': word },
                    { 'attributeValue': word },
                    { 'taskTypeText': word },
                    { "taskCode": word },
                    { 'statusText': word },
                    { 'metadataText': word },
                    { 'searchableText': word }
                ]
            }))
        };

        const results = this.fuse.search(searchPattern);
        const sortedResults = results.map(result => result.item)
            .sort((a, b) => b.date - a.date);
        return sortedResults;
    }

    displayGlobalHistory(globalHistory) {
        const historyHTML = this.generateGlobalHistoryHTML(globalHistory);
        const searchBarHTML = this.generateSearchBarHTML();

        this.identityPicker.openSideContainer(
            this.identityPicker.rules.language.historyTitle,
            searchBarHTML + `<div class="ip-timeline">${historyHTML}</div>`
        );


        this.attachListener();
    }

    generateSearchBarHTML() {
        return `
            <div class="ip-search-bar">
                <input type="text" class="ip-search-input" placeholder="${this.identityPicker.rules.language.searchHistory}">
            </div>
        `;
    }

    attachListener() {
        const searchInput = this.identityPicker.sideContainer.querySelector('.ip-search-input');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const filteredHistory = this.searchHistory(query);
            const historyHTML = this.generateGlobalHistoryHTML(filteredHistory);
            document.querySelector('.ip-timeline').innerHTML = historyHTML;
        });
        searchInput.focus();
        this.identityPicker.sideContainer.querySelectorAll('.ip-copy-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskCode = e.target.dataset.taskCode;
                this.copyToClipboard(taskCode, e.target);
            });
        }
        );
    }

    generateGlobalHistoryHTML(globalHistory) {
        let html = '';
        let currentDate = null;
        let currentDateEvents = [];
        globalHistory.forEach(event => {
            if (event.type === 'task') {
                // Render tasks individually
                html += this.renderSingleEvent(event);
            } else {
                const eventDate = this.formatDateForGrouping(event.date);

                if (eventDate !== currentDate) {
                    if (currentDate) {
                        html += this.renderDateEvents(currentDate, currentDateEvents);
                    }
                    currentDate = eventDate;
                    currentDateEvents = [];
                }
                currentDateEvents.push(event);
            }
        });

        if (currentDate) {
            html += this.renderDateEvents(currentDate, currentDateEvents);
        }
        return html;
    }

    renderSingleEvent(event) {
        return `
            <div class="ip-timeline-item">
                <div class="ip-timeline-point"></div>
                <div class="ip-timeline-content">
                    <div class="ip-date-and-types">
                        <span class="date">${this.formatDate(event.date)}</span>
                        <span class="ip-event-types">
                            <span class="ip-mini-tag ip-tag-${event.type}">${this.getEventTypeLabel(event.type)}</span>
                        </span>
                    </div>
                    ${this.generateTaskChangeHTML(event)}

                </div>
            </div>
        `;
    }

    renderDateEvents(date, events) {
        const eventTypes = this.getEventTypes(events);
        const groupedEvents = this.groupEventsByType(events);

        const hasAttribute = eventTypes.includes('attribute');
        const typesToDisplay = hasAttribute ? ['attribute'] : eventTypes;
        return `
            <div class="ip-timeline-item">
                <div class="ip-timeline-point"></div>
                <div class="ip-timeline-content">
                    <div class="ip-date-and-types">
                        <span class="date">${date}</span>
                        <span class="ip-event-types">
                            ${typesToDisplay.map(type => `<span class="ip-mini-tag ip-tag-${type}">${this.getEventTypeLabel(type)}</span>`).join('')}
                        </span>
                    </div>
                    ${this.renderGroupedEvents(groupedEvents)}
                </div>
            </div>
        `;
    }

    groupEventsByType(events) {
        const grouped = {
            identity: [],
            attribute: [],
            task: []
        };
        events.forEach(event => {
            grouped[event.type].push(event);
        });
        return grouped;
    }

    renderGroupedEvents(groupedEvents) {
        let html = '';
        if (groupedEvents.identity.length > 0) {
            html += this.generateIdentityChangeHeader(groupedEvents.identity[0]);
        }
        if (groupedEvents.attribute.length > 0) {
            html += this.generateAttributeChangesTable(groupedEvents.attribute);
        }
        groupedEvents.task.forEach(taskEvent => {
            html += this.generateTaskChangeHTML(taskEvent);
        });
        return html;
    }

    getEventTypes(events) {
        return [...new Set(events.map(event => event.type))];
    }

    getEventTypeLabel(type) {
        const labels = {
            identity: this.identityPicker.rules.language.identityChangeType,
            attribute: this.identityPicker.rules.language.attributeChangeType,
            task: this.identityPicker.rules.language.taskChangeType
        };
        return labels[type] || type;
    }

    generateIdentityChangeHeader(event) {
        if (!event) return '';
        return `
            <div class="ip-identity-change-header">
                <h3 class="change-type">${event.changeTypeText}</h3>
                <span title="${this.identityPicker.rules.language.author}">${event.authorName}</span>
                ${event.changeMessage ? `<br><small class="ip-change-message">${event.changeMessage}</small>` : ''}
            </div>
        `;
    }

    generateAttributeChangesTable(attributeEvents) {
        if (attributeEvents.length === 0) return '';
        let html = `
            <table class="ip-table">
                <tbody>
        `;
        attributeEvents.forEach(event => {
            html += `
                <tr>
                    <td>${event.attributeLabel}</td>
                    <td>${event.attributeValue}</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        return html;
    }

    generateTaskChangeHTML(event) {
        return `
           <div class="ip-task-change">
            <h3 class="change-type">${event.changeTypeText}</h3>
            <span title="${this.identityPicker.rules.language.author}">${event.authorName}</span><br>
            <button class="ip-copy-button" data-task-code="${event.taskCode}">
                ${event.taskCode ? `${event.taskCode.substring(0, 15)}...` : 'Copy'}
            </button>
            <small>${this.generateTaskMetadata(event.data.task.metadata)}</small>
            </div>
        `;
    }

    generateTaskMetadata(metadata) {
        if (!metadata || Object.keys(metadata).length === 0) return '';
        let html = `<div class="ip-task-metadata">`;
        for (const [key, value] of Object.entries(metadata)) {
            html += `<div><strong>${key}:</strong> ${value}</div>`;
        }
        html += `</div>`;
        return html;
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString(this.identityPicker.config.locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    formatDateForGrouping(date) {
        return date.toLocaleString(this.identityPicker.config.locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    copyToClipboard(text, button) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = this.identityPicker.rules.language.copied || 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
}
