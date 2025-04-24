// ==UserScript==
// @name         BetterSafe by Zeus
// @namespace    http://github.com/ZeusHay/BetterSafe
// @version      1.5
// @description  Filtro avançado para apostas no BetSafe com interface personalizada por categorias e interatividade melhorada
// @author       Zeus
// @match        https://betsafepro.com.br/*
// @license      GPL-3.0
// @updateURL    https://github.com/ZeusHay/BetterSafe/raw/main/betterbetsafe.meta.js
// @downloadURL  https://github.com/ZeusHay/BetterSafe/raw/main/betterbetsafe.user.js
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @connect      github.com
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function() {
    'use strict';

    const CURRENT_VERSION = '1.6';
    const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/ZeusHay/BetterSafe/main/betterbetsafe.version.json';

    const SPORTS_LIST = [
        'Todos',
        'Futebol',
        'Ténis',
        'Basquete',
        'Voleibol',
        'MMA',
        'Criquete',
        'Futebol eletrónico',
        'Beisebol',
        'Basquetebol',
        'Futsal',
        'Handebol',
        'Hóquei',
        'Futebol americano',
        'Bilhar',
        'Dados',
        'Ténis de mesa',
        'Badmínton',
        'Rugby League',
        'Polo aquático',
        'Bandy',
        'Artes marciais',
        'Hóquei de campo',
        'Outros desportos eletrónicos',
        'Xadrez',
        'Futebol gaélico',
        'Fórmula 1',
        'Ciclismo',
        'Voleibol de praia',
        'Corrida de cavalos',
        'Biatlo',
        'Curling',
        'Squash',
        'Netball',
        'Futebol de praia',
        'Floorball',
        'Hurling',
        'Voleibol kung fu',
        'Basquetebol eletrónico',
        'Rugby Union',
        'Boxing',
        'Dota 2',
        'CS:GO',
        'League of Legends',
        'Golf',
        'Lacrosse'
    ];

    const DEFAULT_FILTERS = {
        'AH': true,
        'EH': true,
        'Corners': true,
        'Win By Exactly': true,
        'Dbl Faults': true,
        'Offsides': true,
        'One scoreless': true
    };

    let categorySettings = {};
    let currentCategory = 'Todos';
    let filterStats = {
        total: 0,
        byCategory: {}
    };

    const THEME = {
        bgDark: '#1A1A1A',
        bgMedium: '#2A2A2A',
        bgLight: '#333333',
        accent: '#0F4C28',
        text: 'white',
        textSecondary: '#BBB',
        border: '#444',
        success: '#8dcd41',
        active: '#1F1F1F',
        checkbox: '#12A14A',
        danger: '#d32f2f'
    };

    GM_addStyle(`
        #betsure-utils-panel {
            font-family: 'Arial', sans-serif;
            display: flex;
            flex-direction: column;
            min-width: 450px;
            min-height: 300px;
            resize: both;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            z-index: 2147483647;
            transition: height 0.3s ease;
        }

        #betsure-utils-panel.minimized {
            min-height: 0 !important;
            height: auto !important;
            resize: none !important;
        }

        #panel-header {
            cursor: move;
            user-select: none;
            flex-shrink: 0;
        }

        #panel-content {
            display: flex;
            height: calc(100% - 50px);
            min-height: 250px;
        }

        .category-item {
            padding: 15px;
            cursor: pointer;
            font-weight: bold;
            color: ${THEME.text};
            transition: background-color 0.2s;
        }

        .category-item:hover {
            background-color: ${THEME.accent} !important;
        }

        .custom-input {
            width: 70%;
            padding: 8px;
            background-color: ${THEME.bgMedium};
            color: ${THEME.text};
            border: 1px solid ${THEME.border};
            border-radius: 3px;
        }

        .add-button {
            width: 25%;
            padding: 8px;
            background-color: ${THEME.accent};
            color: ${THEME.text};
            border: none;
            border-radius: 3px;
            cursor: pointer;
            transition: background-color 0.2s;
            margin-left: 5px;
        }

        .add-button:hover {
            background-color: #0a3c1f;
        }

        .danger-button {
            background-color: ${THEME.danger};
        }

        .danger-button:hover {
            background-color: #b71c1c;
        }

        .status-area {
            margin-top: 15px;
            padding: 10px;
            background-color: ${THEME.bgMedium};
            border-radius: 3px;
            font-size: 12px;
            color: ${THEME.textSecondary};
        }

        .hidden-bet {
            display: none !important;
        }

        .custom-checkbox {
            display: flex;
            align-items: center;
            position: relative;
            cursor: pointer;
            user-select: none;
            padding-left: 30px;
            margin-bottom: 10px;
            font-size: 14px;
        }

        .custom-checkbox input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
        }

        .checkmark {
            position: absolute;
            left: 0;
            height: 18px;
            width: 18px;
            background-color: ${THEME.bgMedium};
            border: 1px solid ${THEME.border};
            border-radius: 3px;
        }

        .custom-checkbox:hover input ~ .checkmark {
            background-color: #333;
        }

        .custom-checkbox input:checked ~ .checkmark {
            background-color: ${THEME.checkbox};
        }

        .checkmark:after {
            content: "";
            position: absolute;
            display: none;
        }

        .custom-checkbox input:checked ~ .checkmark:after {
            display: block;
        }

        .custom-checkbox .checkmark:after {
            left: 6px;
            top: 2px;
            width: 5px;
            height: 10px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }

        .filters-section {
            margin-bottom: 20px;
            padding: 10px;
            background-color: ${THEME.bgMedium};
            border-radius: 3px;
        }

        .filters-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 14px;
            color: ${THEME.text};
        }

        .filter-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-gap: 5px;
        }

        .custom-input-container {
            display: flex;
            align-items: center;
            margin-top: 10px;
        }

        .custom-filter-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .remove-filter {
            color: ${THEME.danger};
            cursor: pointer;
            margin-left: 5px;
            font-weight: bold;
            font-size: 16px;
        }

        .remove-filter:hover {
            color: #b71c1c;
        }

        .category-column {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 150px;
            background-color: ${THEME.bgMedium};
        }

        .category-list-container {
            flex-grow: 1;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .settings-button {
            padding: 15px;
            text-align: center;
            background-color: ${THEME.bgDark};
            cursor: pointer;
            font-weight: bold;
            border-top: 1px solid ${THEME.border};
        }

        .settings-button:hover {
            background-color: ${THEME.accent};
        }

        .settings-content {
            padding: 15px;
        }

        .settings-button-container {
            margin-top: 10px;
        }

        .settings-button-container button {
            width: 100%;
            padding: 10px;
            margin-bottom: 8px;
            background-color: ${THEME.danger};
            color: ${THEME.text};
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-weight: bold;
        }

        #category-content {
            flex: 1;
            padding: 15px;
            background-color: ${THEME.bgLight};
            overflow-y: auto;
            max-height: 100%;
        }

        #betsure-utils-panel *::-webkit-scrollbar {
            width: 0;
            height: 0;
        }

        #betsure-utils-panel * {
            scrollbar-width: none;
        }

        #betsure-utils-panel * {
            -ms-overflow-style: none;
        }

        @media (max-width: 600px) {
            #betsure-utils-panel {
                min-width: 350px;
            }

            .category-item {
                padding: 12px 10px;
                font-size: 12px;
            }

            .category-column {
                width: 120px;
            }

            .settings-button {
                padding: 12px 10px;
                font-size: 12px;
            }

            .custom-checkbox {
                font-size: 12px;
            }

            .filter-list {
                grid-template-columns: 1fr;
            }

            h3, h4 {
                font-size: 14px !important;
            }

            #category-content {
                padding: 10px;
            }
        }

        @media (max-width: 450px) {
            #betsure-utils-panel {
                min-width: 300px;
            }

            .category-item {
                padding: 10px 8px;
                font-size: 11px;
            }

            .category-column {
                width: 100px;
            }

            .custom-checkbox {
                font-size: 11px;
                padding-left: 25px;
            }

            .checkmark {
                height: 16px;
                width: 16px;
            }

            #category-content {
                padding: 8px;
            }
        }
    `);

    function isNewerVersion(currentVersion, remoteVersion) {
        const currentParts = currentVersion.split('.').map(Number);
        const remoteParts = remoteVersion.split('.').map(Number);
        
        for (let i = 0; i < Math.max(currentParts.length, remoteParts.length); i++) {
            const currentPart = currentParts[i] || 0;
            const remotePart = remoteParts[i] || 0;
            
            if (remotePart > currentPart) {
                return true;
            } else if (remotePart < currentPart) {
                return false;
            }
        }
        
        return false;
    }    

    function checkForUpdates() {
        try {
            GM_xmlhttpRequest({
                method: 'GET',
                url: VERSION_CHECK_URL,
                onload: function(response) {
                    try {
                        const versionInfo = JSON.parse(response.responseText);
                        
                        if (versionInfo && versionInfo.version && isNewerVersion(CURRENT_VERSION, versionInfo.version)) {
                            console.log('Nova versão disponível!');
                            showUpdateNotification(versionInfo);
                        }
                    } catch (e) {
                        console.error('Erro ao analisar informações de versão:', e);
                    }
                },
                onerror: function(error) {
                    console.error('Erro ao verificar atualizações:', error);
                }
            });
        } catch (e) {
            console.error('Erro ao verificar atualizações:', e);
        }
    }

    function showUpdateNotification(versionInfo) {
        const updatePanel = document.createElement('div');
        updatePanel.style.position = 'fixed';
        updatePanel.style.bottom = '20px';
        updatePanel.style.right = '20px';
        updatePanel.style.backgroundColor = THEME.bgDark;
        updatePanel.style.border = `1px solid ${THEME.border}`;
        updatePanel.style.borderRadius = '5px';
        updatePanel.style.padding = '15px';
        updatePanel.style.color = THEME.text;
        updatePanel.style.zIndex = '9999999';
        updatePanel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.5)';
        
        updatePanel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">BetterSafe por Zeus - Desatualizado</div>
            <div style="margin-bottom: 15px;">Sua versão: ${CURRENT_VERSION} / Nova versão: ${versionInfo.version}</div>
            <div style="margin-bottom: 10px;">Novidades: ${versionInfo.changelog || 'Melhorias e correções'}</div>
            <button id="update-button" style="background-color: ${THEME.accent}; color: white; border: none; padding: 8px 15px; border-radius: 3px; cursor: pointer; width: 100%;">Atualizar Agora</button>
        `;
        
        document.body.appendChild(updatePanel);
        
        document.getElementById('update-button').addEventListener('click', function() {
            if (versionInfo.downloadUrl) {
                window.location.href = versionInfo.downloadUrl;
            } else {
                GM_openInTab('https://github.com/ZeusHay/BetterSafe/raw/refs/heads/main/betterbetsafe.user.js');
            }
        });
    }

    function loadSettings() {
        try {
            categorySettings = GM_getValue('betsure_categorySettings');

            if (!categorySettings || typeof categorySettings !== 'object') {
                categorySettings = {};
            }

            SPORTS_LIST.forEach(sport => {
                if (!categorySettings[sport]) {
                    categorySettings[sport] = {
                        active: true,
                        filters: sport === 'Todos' ? {...DEFAULT_FILTERS} : {},
                        customFilters: {}
                    };
                } else {
                    if (sport === 'Todos') {
                        categorySettings[sport].filters = {
                            ...DEFAULT_FILTERS,
                            ...categorySettings[sport].filters
                        };
                    }
                    if (!categorySettings[sport].customFilters) {
                        categorySettings[sport].customFilters = {};
                    }
                }
            });

            currentCategory = GM_getValue('betsure_currentCategory') || 'Todos';
            if (!SPORTS_LIST.includes(currentCategory) && !Object.keys(categorySettings).includes(currentCategory)) {
                currentCategory = 'Todos';
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            resetAllData();
        }
    }

    function saveSettings() {
        try {
            GM_setValue('betsure_categorySettings', categorySettings);
            GM_setValue('betsure_currentCategory', currentCategory);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
        }
    }

    function savePanelPosition(x, y, width, height) {
        GM_setValue('betsure_panelPosition', { x, y, width, height });
    }

    function loadPanelPosition() {
        const savedPosition = GM_getValue('betsure_panelPosition', {
            x: Math.max(10, window.innerWidth - 510),
            y: 50,
            width: 500,
            height: 500
        });

        const maxX = window.innerWidth - Math.min(savedPosition.width, window.innerWidth * 0.9);
        const maxY = window.innerHeight - Math.min(savedPosition.height, window.innerHeight * 0.9);

        const x = Math.max(0, Math.min(savedPosition.x, maxX));
        const y = Math.max(0, Math.min(savedPosition.y, maxY));

        const width = Math.min(savedPosition.width, window.innerWidth * 0.9);
        const height = Math.min(savedPosition.height, window.innerHeight * 0.9);

        return { x, y, width, height };
    }

    function resetAllData() {
        categorySettings = {};
        SPORTS_LIST.forEach(sport => {
            categorySettings[sport] = {
                active: true,
                filters: sport === 'Todos' ? {...DEFAULT_FILTERS} : {},
                customFilters: {}
            };
        });
        currentCategory = 'Todos';

        try {
            GM_deleteValue('betsure_categorySettings');
            GM_deleteValue('betsure_currentCategory');
        } catch (error) {
            console.error('Erro ao resetar dados:', error);
        }

        saveSettings();

        if (document.getElementById('category-list')) {
            updateCategoryList();
            updateCategoryContent();
        }

        GM_notification({
            title: 'BetSure Utils',
            text: 'Configurações resetadas com sucesso!',
            timeout: 3000
        });
    }

    function applyFilters() {
        filterStats = {
            total: 0,
            byCategory: {}
        };

        document.querySelectorAll('.hidden-bet').forEach(bet => {
            bet.classList.remove('hidden-bet');
        });

        const betContainers = document.querySelectorAll('span > div[id="1"]');

        betContainers.forEach(betContainer => {
            let betTypeText = '';
            let sportTypeText = 'Desconhecido';
            let teamNamesText = 'Times desconhecidos';
            let shouldHide = false;

            const sportTypeElements = betContainer.querySelectorAll('p.text-xs.uppercase.tracking-wide.text-\\[white\\].font-bold');
            if (sportTypeElements.length > 0) {
                sportTypeText = sportTypeElements[0].textContent.trim();

                if (!categorySettings[sportTypeText]) {
                    categorySettings[sportTypeText] = {
                        active: true,
                        filters: {},
                        customFilters: {}
                    };
                    saveSettings();

                    if (document.getElementById('category-list')) {
                        updateCategoryList();
                    }
                }
            }

            const todosFilters = [];
            const categoryFilters = [];

            if (categorySettings['Todos']?.active) {
                Object.entries(categorySettings['Todos'].filters).forEach(([filter, isActive]) => {
                    if (isActive) todosFilters.push(filter);
                });

                Object.entries(categorySettings['Todos'].customFilters).forEach(([filter, isActive]) => {
                    if (isActive) todosFilters.push(filter);
                });
            }

            if (categorySettings[sportTypeText]?.active && sportTypeText !== 'Todos') {
                Object.entries(categorySettings[sportTypeText].filters || {}).forEach(([filter, isActive]) => {
                    if (isActive) categoryFilters.push(filter);
                });

                Object.entries(categorySettings[sportTypeText].customFilters || {}).forEach(([filter, isActive]) => {
                    if (isActive) categoryFilters.push(filter);
                });
            }

            const activeFilters = [...todosFilters, ...categoryFilters];

            if (activeFilters.length === 0) {
                return;
            }

            const allBetTypeSpans = betContainer.querySelectorAll('span[class*="text-[#1e9622]"]');

            for (const span of allBetTypeSpans) {
                const spanText = span.textContent.trim();

                if (activeFilters.some(term => spanText.includes(term))) {
                    shouldHide = true;
                    betTypeText = spanText;
                    break;
                }
            }

            if (!shouldHide) {
                const allSpans = betContainer.querySelectorAll('span');
                for (const span of allSpans) {
                    const spanText = span.textContent.trim();
                    if (activeFilters.some(term => spanText.includes(term))) {
                        shouldHide = true;
                        betTypeText = spanText;
                        break;
                    }
                }
            }

            const teamNameElements = betContainer.querySelectorAll('span.text-white.w-\\[15rem\\]');
            if (teamNameElements.length > 0) {
                teamNamesText = teamNameElements[0].textContent.trim();
            }

            if (shouldHide) {
                betContainer.classList.add('hidden-bet');

                filterStats.total++;
                filterStats.byCategory[sportTypeText] = (filterStats.byCategory[sportTypeText] || 0) + 1;

                console.log(`Ocultada: ${sportTypeText} - ${teamNamesText} - ${betTypeText}`);
            }
        });

        updateStatusArea();
    }

    function updateStatusArea() {
        const statusArea = document.getElementById('status-area');
        if (!statusArea) return;

        if (currentCategory !== 'Todos' && filterStats.total > 0) {
            const categoryCount = filterStats.byCategory[currentCategory] || 0;
            statusArea.textContent = `Ocultas: ${categoryCount} apostas em ${currentCategory}`;
        }
        else if (filterStats.total > 0) {
            let statusText = `Ocultas: ${filterStats.total} apostas no total`;

            if (currentCategory === 'Todos') {
                const categories = Object.keys(filterStats.byCategory).sort();
                if (categories.length > 0) {
                    statusText += '\n';
                    statusText += categories.map(cat => `${cat}: ${filterStats.byCategory[cat]}`).join('\n');
                }
            }

            statusArea.textContent = statusText;
            statusArea.style.whiteSpace = 'pre-line';
        } else {
            statusArea.textContent = 'Nenhuma aposta oculta';
        }
    }

    function createCustomCheckbox(checked, onChange, labelText) {
        const container = document.createElement('label');
        container.className = 'custom-checkbox';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checked;
        input.addEventListener('change', () => {
            onChange(input.checked);
        });

        const checkmark = document.createElement('span');
        checkmark.className = 'checkmark';

        const label = document.createElement('span');
        label.textContent = labelText;

        container.appendChild(input);
        container.appendChild(checkmark);
        container.appendChild(label);

        return container;
    }

    function updateCategoryContent() {
        const contentArea = document.getElementById('category-content');
        if (!contentArea) return;

        const category = currentCategory;
        const settings = categorySettings[category];

        contentArea.innerHTML = '';

        if (category === 'Configurações') {
            showSettingsContent(contentArea);
            return;
        }

        const categoryToggle = document.createElement('div');
        categoryToggle.style.marginBottom = '15px';
        categoryToggle.style.display = 'flex';
        categoryToggle.style.alignItems = 'center';
        categoryToggle.style.justifyContent = 'space-between';

        const categoryLabel = document.createElement('span');
        categoryLabel.textContent = `Filtros para ${category}`;
        categoryLabel.style.fontWeight = 'bold';

        const categoryActiveCheckbox = createCustomCheckbox(
            settings.active,
            (checked) => {
                categorySettings[category].active = checked;
                saveSettings();
                applyFilters();
            },
            'Ativo'
        );

        categoryToggle.appendChild(categoryLabel);
        categoryToggle.appendChild(categoryActiveCheckbox);

        const defaultFiltersSection = document.createElement('div');
        defaultFiltersSection.className = 'filters-section';

        const defaultFiltersTitle = document.createElement('h4');
        defaultFiltersTitle.textContent = 'Filtros padrão';

        const defaultFiltersList = document.createElement('div');
        defaultFiltersList.className = 'filter-list';

        Object.keys(DEFAULT_FILTERS).forEach(filter => {
            if (settings.filters[filter] === undefined) {
                settings.filters[filter] = false;
            }

            const filterCheckbox = createCustomCheckbox(
                settings.filters[filter],
                (checked) => {
                    categorySettings[category].filters[filter] = checked;
                    saveSettings();
                    applyFilters();
                },
                filter
            );

            defaultFiltersList.appendChild(filterCheckbox);
        });

        defaultFiltersSection.appendChild(defaultFiltersTitle);
        defaultFiltersSection.appendChild(defaultFiltersList);

        const customFiltersSection = document.createElement('div');
        customFiltersSection.className = 'filters-section';

        const customFiltersTitle = document.createElement('h4');
        customFiltersTitle.textContent = 'Filtros personalizados';

        const customFiltersList = document.createElement('div');
        customFiltersList.className = 'filter-list';

        Object.entries(settings.customFilters || {}).forEach(([filter, isActive]) => {
            const filterContainer = document.createElement('div');
            filterContainer.className = 'custom-filter-item';

            const filterCheckbox = createCustomCheckbox(
                isActive,
                (checked) => {
                    categorySettings[category].customFilters[filter] = checked;
                    saveSettings();
                    applyFilters();
                },
                filter
            );

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-filter';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remover filtro';
            removeBtn.addEventListener('click', () => {
                delete categorySettings[category].customFilters[filter];
                saveSettings();
                applyFilters();
                updateCategoryContent();
            });

            filterContainer.appendChild(filterCheckbox);
            filterContainer.appendChild(removeBtn);

            customFiltersList.appendChild(filterContainer);
        });

        const customInputContainer = document.createElement('div');
        customInputContainer.className = 'custom-input-container';

        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'custom-input';
        customInput.placeholder = 'Digite novo filtro...';

        const addButton = document.createElement('button');
        addButton.textContent = '+';
        addButton.className = 'add-button';

        const addCustomFilter = () => {
            const newFilter = customInput.value.trim();
            if (newFilter && !settings.customFilters[newFilter]) {
                categorySettings[category].customFilters[newFilter] = true;
                saveSettings();
                applyFilters();
                updateCategoryContent();
                customInput.value = '';
            }
        };

        addButton.addEventListener('click', addCustomFilter);
        customInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addCustomFilter();
        });

        customInputContainer.appendChild(customInput);
        customInputContainer.appendChild(addButton);

        customFiltersSection.appendChild(customFiltersTitle);
        customFiltersSection.appendChild(customFiltersList);
        customFiltersSection.appendChild(customInputContainer);

        const statusArea = document.createElement('div');
        statusArea.id = 'status-area';
        statusArea.className = 'status-area';
        statusArea.textContent = 'Pronto';

        contentArea.appendChild(categoryToggle);
        contentArea.appendChild(defaultFiltersSection);
        contentArea.appendChild(customFiltersSection);
        contentArea.appendChild(statusArea);

        updateStatusArea();
    }

    function showSettingsContent(contentArea) {
        const settingsTitle = document.createElement('h3');
        settingsTitle.textContent = 'Ajustes';
        settingsTitle.style.marginTop = '0';
        settingsTitle.style.marginBottom = '15px';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'settings-button-container';

        const resetButton = document.createElement('button');
        resetButton.textContent = 'Resetar Todas as Configurações';
        resetButton.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja resetar todas as configurações? Esta ação não pode ser desfeita.')) {
                resetAllData();
            }
        });

        const exportButton = document.createElement('button');
        exportButton.textContent = 'Exportar Configurações';
        exportButton.style.backgroundColor = THEME.accent;
        exportButton.addEventListener('click', () => {
            try {
                const dataStr = JSON.stringify(categorySettings, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

                const exportFileDefaultName = 'betsure_config.json';

                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();

                GM_notification({
                    title: 'BetSure Utils',
                    text: 'Configurações exportadas com sucesso!',
                    timeout: 3000
                });
            } catch (error) {
                console.error('Erro ao exportar configurações:', error);
                alert('Erro ao exportar configurações. Veja o console para mais detalhes.');
            }
        });

        const importButton = document.createElement('button');
        importButton.textContent = 'Importar Configurações';
        importButton.style.backgroundColor = THEME.accent;

        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json';
        importInput.style.display = 'none';

        importInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const importedSettings = JSON.parse(e.target.result);

                    if (typeof importedSettings !== 'object') {
                        throw new Error('Formato de arquivo inválido.');
                    }

                    categorySettings = importedSettings;

                    SPORTS_LIST.forEach(sport => {
                        if (!categorySettings[sport]) {
                            categorySettings[sport] = {
                                active: true,
                                filters: sport === 'Todos' ? {...DEFAULT_FILTERS} : {},
                                customFilters: {}
                            };
                        } else {
                            if (sport === 'Todos') {
                                categorySettings[sport].filters = {
                                    ...DEFAULT_FILTERS,
                                    ...categorySettings[sport].filters
                                };
                            }
                            if (!categorySettings[sport].customFilters) {
                                categorySettings[sport].customFilters = {};
                            }
                        }
                    });

                    saveSettings();
                    updateCategoryList();
                    updateCategoryContent();
                    applyFilters();

                    GM_notification({
                        title: 'BetSure Utils',
                        text: 'Configurações importadas com sucesso!',
                        timeout: 3000
                    });
                } catch (error) {
                    console.error('Erro ao importar configurações:', error);
                    alert('Erro ao importar configurações. O arquivo pode estar corrompido ou em formato inválido.');
                }
            };

            reader.readAsText(file);
        });

        importButton.addEventListener('click', () => {
            importInput.click();
        });

        const versionInfo = document.createElement('div');
        versionInfo.textContent = 'Versão 1.5';
        versionInfo.style.marginTop = '20px';
        versionInfo.style.fontSize = '12px';
        versionInfo.style.color = THEME.textSecondary;
        versionInfo.style.textAlign = 'center';

        buttonsContainer.appendChild(resetButton);
        buttonsContainer.appendChild(exportButton);
        buttonsContainer.appendChild(importButton);
        buttonsContainer.appendChild(importInput);

        contentArea.appendChild(settingsTitle);
        contentArea.appendChild(buttonsContainer);
        contentArea.appendChild(versionInfo);
    }

    function createCategoryItem(category) {
        const isActive = category === currentCategory;

        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.style.backgroundColor = isActive ? THEME.active : 'transparent';
        categoryItem.textContent = category.toUpperCase();

        categoryItem.addEventListener('click', () => {
            currentCategory = category;
            saveSettings();
            updateCategoryList();
            updateCategoryContent();
        });

        return categoryItem;
    }

    function updateCategoryList() {
        const categoryList = document.getElementById('category-list');
        if (!categoryList) return;

        categoryList.innerHTML = '';

        const todosItem = createCategoryItem('Todos');
        categoryList.appendChild(todosItem);

        const allCategories = new Set([
            ...SPORTS_LIST.filter(cat => cat !== 'Todos' && cat !== 'Configurações'),
            ...Object.keys(categorySettings).filter(cat => cat !== 'Todos' && cat !== 'Configurações')
        ]);

        [...allCategories].sort().forEach(category => {
            const categoryItem = createCategoryItem(category);
            categoryList.appendChild(categoryItem);
        });

        if (currentCategory === 'Configurações') {
            document.querySelector('.settings-button').style.backgroundColor = THEME.active;
        } else {
            document.querySelector('.settings-button').style.backgroundColor = '';
        }
    }

    function makeDraggable(panel) {
        const header = panel.querySelector('#panel-header');
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;

            panel.style.cursor = 'grabbing';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            const maxX = window.innerWidth - panel.offsetWidth;
            const maxY = window.innerHeight - panel.offsetHeight;

            panel.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            panel.style.top = `${Math.max(0, Math.min(y, maxY))}px`;

            e.preventDefault();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.style.cursor = '';

                savePanelPosition(
                    parseInt(panel.style.left, 10) || 0,
                    parseInt(panel.style.top, 10) || 0,
                    panel.offsetWidth,
                    panel.offsetHeight
                );
            }
        });

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                savePanelPosition(
                    parseInt(panel.style.left, 10) || 0,
                    parseInt(panel.style.top, 10) || 0,
                    entry.contentRect.width,
                    entry.contentRect.height
                );
            }
        });

        resizeObserver.observe(panel);
    }

    function addControlPanel() {
        const savedPosition = loadPanelPosition();

        const panel = document.createElement('div');
        panel.id = 'betsure-utils-panel';
        panel.style.position = 'fixed';
        panel.style.top = `${savedPosition.y}px`;
        panel.style.left = `${savedPosition.x}px`;
        panel.style.backgroundColor = THEME.bgDark;
        panel.style.border = `1px solid ${THEME.border}`;
        panel.style.borderRadius = '5px';
        panel.style.color = THEME.text;
        panel.style.width = `${savedPosition.width}px`;
        panel.style.height = `${savedPosition.height}px`;

        const header = document.createElement('div');
        header.id = 'panel-header';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.padding = '10px 15px';
        header.style.backgroundColor = THEME.bgDark;
        header.style.borderBottom = `1px solid ${THEME.border}`;

        const title = document.createElement('h3');
        title.textContent = 'BetterSafe by Zeus';
        title.style.margin = '0';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '16px';

        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '−';
        toggleBtn.style.background = 'none';
        toggleBtn.style.border = 'none';
        toggleBtn.style.color = THEME.textSecondary;
        toggleBtn.style.fontSize = '20px';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.padding = '0 5px';

        header.appendChild(title);
        header.appendChild(toggleBtn);

        const content = document.createElement('div');
        content.id = 'panel-content';

        const categoryColumn = document.createElement('div');
        categoryColumn.className = 'category-column';
        categoryColumn.style.display = 'flex';
        categoryColumn.style.flexDirection = 'column';

        const categoryListContainer = document.createElement('div');
        categoryListContainer.className = 'category-list-container';
        categoryListContainer.style.overflow = 'auto';
        categoryListContainer.style.flexGrow = '1';

        const categoryList = document.createElement('div');
        categoryList.id = 'category-list';

        const settingsButton = document.createElement('div');
        settingsButton.className = 'settings-button';
        settingsButton.textContent = 'AJUSTES';
        settingsButton.style.flex = '0 0 auto';
        settingsButton.addEventListener('click', () => {
            currentCategory = 'Configurações';
            updateCategoryList();
            updateCategoryContent();
        });

        categoryListContainer.appendChild(categoryList);

        categoryColumn.appendChild(categoryListContainer);
        categoryColumn.appendChild(settingsButton);

        const contentColumn = document.createElement('div');
        contentColumn.id = 'category-content';

        content.appendChild(categoryColumn);
        content.appendChild(contentColumn);

        panel.appendChild(header);
        panel.appendChild(content);

        const existingPanel = document.getElementById('betsure-utils-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        document.body.appendChild(panel);

        makeDraggable(panel);

        toggleBtn.addEventListener('click', () => {
            if (content.style.display === 'none') {
                panel.classList.remove('minimized');
                panel.style.height = panel.getAttribute('data-full-height') || `${savedPosition.height}px`;
                panel.style.minHeight = '300px';
                panel.style.resize = 'both';
                content.style.display = 'flex';
                toggleBtn.textContent = '−';
            } else {
                panel.setAttribute('data-full-height', `${panel.offsetHeight}px`);
                content.style.display = 'none';
                panel.classList.add('minimized');
                toggleBtn.textContent = '+';
            }
        });

        updateCategoryList();
        updateCategoryContent();
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            loadSettings();
            addControlPanel();
            applyFilters();
            checkForUpdates();
        }, 1500);
    });

    const observer = new MutationObserver((mutations) => {
        setTimeout(() => {
            applyFilters();
        }, 300);
    });

    window.addEventListener('load', () => {
        setTimeout(() => {
            const betListContainer = document.querySelector('.col-span-4');
            if (betListContainer) {
                observer.observe(betListContainer, { childList: true, subtree: true });
                console.log('BetSure Utils: Observador iniciado');
            } else {
                console.error('BetSure Utils: Não foi possível encontrar o container de apostas');
            }
        }, 2000);
    });
})();