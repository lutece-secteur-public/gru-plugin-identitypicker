<#macro identityPicker
    search=true
    creation=false
    update=false
    selection=true
    createTask=false
    fieldMappings="{}"
    cuid=""
    autoFill=false
    btnLabelShow=true
    btnIcon=""
    btnLabel="#i18n{identitypicker.language.searchButton}"
    config="{}">
    <#assign uniqueId=.now?long>
        <button class="btn btn-primary" id="ip-open-button-${uniqueId}" title="${btnLabel}" disabled=disabled>
            <#if btnIcon !=''>
                <@icon style=btnIcon />
            </#if>
            <#if btnLabelShow>
                ${btnLabel}
            </#if>
        </button>
        <script type="module">
        import IdentityPicker from './js/admin/plugins/identitypicker/dist/identitypicker.min.js';
        const defaultConfig = {
            choices: {
                minSearchLength: 3,
                debounceTime: 300,
            },
            display: {
                modalMaxHeight: 0.9,
            },
            endpoints: {
                permissions: 'rest/identitypicker/api/permissions',
                search: 'rest/identitypicker/api/search',
                identity: 'rest/identitypicker/api/identity',
                history: 'history',
                tasks: 'tasks',
                rules: 'rest/identitypicker/api/rules',
                countries: 'rest/geocodesclient/api/v1/countries',
                cities: 'rest/geocodesclient/api/v1/cities',
            },
            search: ${search?c},
            creation: ${creation?c},
            update: ${update?c},
            selection: ${selection?c},
            autoFill: ${autoFill?c},
            create_task: ${createTask?c},
            cuid: '${cuid}',
            fieldMapping: ${fieldMappings}
        };
        const userConfig = JSON.parse('${config?json_string}');
        const mergedConfig = {
            ...defaultConfig,
            ...userConfig,
            choices: {
                ...defaultConfig.choices,
                ...userConfig.choices
            },
            display: {
                ...defaultConfig.display,
                ...userConfig.display
            },
            endpoints: {
                ...defaultConfig.endpoints,
                ...userConfig.endpoints
            },
        };
        new IdentityPicker('${uniqueId}', mergedConfig);
        </script>
</#macro>