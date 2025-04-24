// ==UserScript==
// @name         BetterSafe by Zeus
// @namespace    http://github.com/ZeusHay/BetterSafe
// @version      1.1.0
// @description  Filtro avançado para apostas no BetSafe com interface personalizada por categorias, combinações de casas de apostas e interatividade melhorada
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

    const CURRENT_VERSION = '1.1.0';
    const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/ZeusHay/BetterSafe/main/betterbetsafe.version.json';

    const CATEGORIES = {
        FILTER_BETS: "Filtrar Apostas",
        BETTING_HOUSES: "Casas Combinadas",
        CALCULATOR: "Calculadora",
        SETTINGS: "Configurações"
    };

    const CATEGORY_ICONS = {
        FILTER_BETS: "🔍",
        BETTING_HOUSES: "🏢",
        CALCULATOR: "🧮",
        SETTINGS: "⚙️"
    };

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

    const BETTING_HOUSES = [
        'Blaze',
        'JonBet',
        'BetVip',
        'Betboo',
        'EstrelaBet',
        'StakeBet',
        'Bet7K',
        'Betão',
        'h2bet',
        'Betano',
        'Bet365',
        'Superbet',
        'SportingBet',
        'Novibet',
        'Kto',
        'McGames',
        'Pinnacle',
        'Vbet',
        '7Games',
        'BolsaDeAposta'
    ];

    const DEFAULT_FILTERS = {
        'AH': false,
        'EH': false,
        'Corners': false,
        'Win By Exactly': false,
        'Dbl Faults': false,
        'Offsides': false,
        'One scoreless': false,
        'Cards': false,
        'Falts': false,
        'X2': false
    };

    let settings = {
        filterBets: {},
        bettingHouses: {
            combinations: {},
            showOnlyFiltered: false
        },
        currentMainCategory: CATEGORIES.FILTER_BETS,
        currentSportCategory: 'Todos',
        calculator: {
            keepOddWithDifferentValues: false
        },
        notifications: {
            enabled: false,
            soundEnabled: false,
            soundBase64: null,
            soundFilename: null,
            delayBetweenAlerts: 300
        }
    };

    let filterStats = {
        total: 0,
        byCategory: {},
        byHouseCombination: {}
    };

    let calculatorValues = {
        house1Odd: 0,
        house1Amount: 0,
        house2Odd: 0,
        house2Amount: 0,
        partialBet: {
            active: false,
            house: '2',
            actualAmount: 0
        }
    };

    let lastNotificationTime = 0;
    let pendingNotifications = 0;
    let notificationAudio = null;
    
    let knownBets = new Set();

    function loadCalculatorValues() {
        const savedValues = GM_getValue('betsure_calculator_values');
        if (savedValues) {
            calculatorValues = savedValues;
        }
    }

    function saveCalculatorValues() {
        GM_setValue('betsure_calculator_values', calculatorValues);
    }

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

        .main-nav {
            display: flex;
            background-color: ${THEME.bgDark};
            border-bottom: 1px solid ${THEME.border};
        }

        .main-nav-item {
            padding: 12px 15px;
            cursor: pointer;
            font-weight: bold;
            color: ${THEME.text};
            transition: background-color 0.2s;
            text-align: center;
            flex: 1;
        }

        .main-nav-item:hover {
            background-color: ${THEME.accent} !important;
        }

        .main-nav-item.active {
            background-color: ${THEME.active};
        }

        .main-nav-item .icon {
            display: none;
            font-size: 16px;
        }

        .main-nav-item .text {
            display: inline;
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

        .number-input {
            width: 100%;
            padding: 8px;
            background-color: ${THEME.bgMedium};
            color: ${THEME.text};
            border: 1px solid ${THEME.border};
            border-radius: 3px;
            margin-top: 5px;
            margin-bottom: 10px;
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

        .house-combination-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            grid-gap: 10px;
            margin-top: 15px;
        }

        .house-combination-item {
            background-color: ${THEME.bgMedium};
            padding: 10px;
            border-radius: 3px;
            display: flex;
            flex-direction: column;
        }

        .house-combination-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .house-combination-title {
            font-weight: bold;
            font-size: 14px;
        }

        .select-house {
            width: 100%;
            padding: 6px;
            background-color: ${THEME.bgLight};
            color: ${THEME.text};
            border: 1px solid ${THEME.border};
            border-radius: 3px;
            margin-bottom: 8px;
        }

        #category-content {
            flex: 1;
            padding: 15px;
            background-color: ${THEME.bgLight};
            overflow-y: auto;
            max-height: 100%;
        }

        .action-button-group {
            display: flex;
            gap: 5px;
        }

        .action-button {
            flex: 1;
            padding: 6px;
            font-size: 12px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .show-button {
            background-color: ${THEME.accent};
            color: white;
        }

        .show-button:hover {
            background-color: #0a3c1f;
        }

        .ignore-button {
            background-color: ${THEME.danger};
            color: white;
        }

        .ignore-button:hover {
            background-color: #b71c1c;
        }

        .add-combination-button {
            background-color: ${THEME.accent};
            color: white;
            padding: 10px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .add-combination-button:hover {
            background-color: #0a3c1f;
        }

        .calculator-section {
            margin-bottom: 15px;
            padding: 15px;
            background-color: #2A2A2A;
            border-radius: 5px;
        }

        .bet-row {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 1px solid #444;
        }

        .house-label {
            width: 70px;
            font-weight: bold;
            color: white;
        }

        .input-group {
            display: flex;
            flex: 1;
            gap: 10px;
            margin: 0 10px;
        }

        .odd-input {
            width: 80px;
            padding: 8px;
            background-color: #383838;
            color: white;
            border: 1px solid #444;
            border-radius: 3px;
            font-size: 13px;
        }

        .amount-input {
            width: 100px;
            padding: 8px;
            background-color: #383838;
            color: white;
            border: 1px solid #444;
            border-radius: 3px;
            font-size: 13px;
        }

        .wider {
            width: 100%;
        }

        .profit-display {
            width: 150px;
            text-align: right;
            font-size: 14px;
        }

        .total-row {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #444;
            text-align: right;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .load-button {
            background-color: #0F4C28;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 5px 8px;
            font-size: 11px;
            cursor: pointer;
            margin-right: 10px;
        }

        .load-button:hover {
            background-color: #12A14A;
        }

        .profit {
            color: #8dcd41;
            font-weight: bold;
        }

        .adjustment-info {
            margin-top: 10px;
            margin-bottom: 10px;
            padding: 10px;
            background-color: #1A1A1A;
            border-radius: 3px;
            display: none;
        }

        .adjustment-info.visible {
            display: block;
        }

        .equalize {
            color: #8dcd41;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .no-loss {
            color: #4dabf5;
            font-weight: bold;
        }

        .loss {
            color: #ff6b6b;
            font-weight: bold;
        }

        .file-input-container {
            display: flex;
            flex-direction: column;
            margin-top: 15px;
        }

        .file-input-label {
            background-color: ${THEME.accent};
            color: ${THEME.text};
            padding: 10px;
            border-radius: 3px;
            text-align: center;
            cursor: pointer;
            margin-bottom: 10px;
            transition: background-color 0.2s;
        }

        .file-input-label:hover {
            background-color: #0a3c1f;
        }

        .file-input {
            display: none;
        }

        .file-name {
            font-size: 12px;
            color: ${THEME.textSecondary};
            margin-top: 5px;
            word-break: break-all;
        }

        .play-test-button {
            background-color: ${THEME.bgMedium};
            border: 1px solid ${THEME.border};
            color: ${THEME.text};
            padding: 8px;
            border-radius: 3px;
            cursor: pointer;
            margin-top: 10px;
            transition: background-color 0.2s;
        }

        .play-test-button:hover {
            background-color: ${THEME.accent};
        }

        .notification-settings {
            background-color: ${THEME.bgMedium};
            padding: 15px;
            border-radius: 3px;
            margin-top: 15px;
        }

        .notification-settings h4 {
            margin-top: 0;
            margin-bottom: 15px;
        }

        .delay-input {
            width: 60px;
            padding: 5px;
            background-color: ${THEME.bgLight};
            color: ${THEME.text};
            border: 1px solid ${THEME.border};
            border-radius: 3px;
            margin: 0 10px;
        }

        .notification-input-group {
            display: flex;
            align-items: center;
            margin-top: 10px;
        }

        @media (max-width: 600px) {
            .bet-row {
                flex-direction: column;
                align-items: flex-start;
            }

            .house-label {
                width: 100%;
                margin-bottom: 5px;
            }

            .input-group {
                width: 100%;
                margin: 5px 0;
            }

            .profit-display {
                width: 100%;
                text-align: left;
                margin-top: 5px;
            }
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

            .main-nav-item .icon {
                display: inline;
                font-size: 18px;
            }

            .main-nav-item .text {
                display: none;
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

    function loadNotificationSound() {
        if (settings.notifications.soundBase64) {
            notificationAudio = new Audio(`data:audio/mp3;base64,${settings.notifications.soundBase64}`);
            notificationAudio.volume = 1.0;
        } else {
            notificationAudio = null;
        }
    }

    function playNotificationSound() {
        if (!settings.notifications.enabled || !settings.notifications.soundEnabled || !notificationAudio) {
            return;
        }

        const now = Date.now();
        const timeSinceLastNotification = now - lastNotificationTime;

        if (timeSinceLastNotification < settings.notifications.delayBetweenAlerts) {
            pendingNotifications++;
            
            setTimeout(() => {
                pendingNotifications--;
                playNotificationSound();
            }, settings.notifications.delayBetweenAlerts - timeSinceLastNotification);
            
            return;
        }

        try {
            const audioClone = notificationAudio.cloneNode();
            audioClone.play();
            lastNotificationTime = now;
        } catch (error) {
            console.error('Erro ao reproduzir notificação:', error);
        }
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
            const savedSettings = GM_getValue('betsure_settings');
            loadCalculatorValues();

            if (savedSettings && typeof savedSettings === 'object') {
                settings = savedSettings;
            } else {
                const oldCategorySettings = GM_getValue('betsure_categorySettings');
                const oldCurrentCategory = GM_getValue('betsure_currentCategory');

                if (oldCategorySettings && typeof oldCategorySettings === 'object') {
                    settings.filterBets = oldCategorySettings;
                    settings.currentSportCategory = oldCurrentCategory || 'Todos';
                } else {
                    initializeDefaultSettings();
                }
            }

            if (!settings.filterBets) {
                settings.filterBets = {};
            }

            if (!settings.bettingHouses) {
                settings.bettingHouses = {
                    combinations: {},
                    showOnlyFiltered: false
                };
            }

            if (!settings.bettingHouses.combinations) {
                settings.bettingHouses.combinations = {};
            }

            if (settings.bettingHouses.showOnlyFiltered === undefined) {
                settings.bettingHouses.showOnlyFiltered = false;
            }

            if (!settings.calculator) {
                settings.calculator = {
                    keepOddWithDifferentValues: false
                };
            }

            if (!settings.notifications) {
                settings.notifications = {
                    enabled: false,
                    soundEnabled: false,
                    soundBase64: null,
                    soundFilename: null,
                    delayBetweenAlerts: 300
                };
            }

            if (!settings.currentMainCategory) {
                settings.currentMainCategory = CATEGORIES.FILTER_BETS;
            }

            if (!settings.currentSportCategory ||
                (!SPORTS_LIST.includes(settings.currentSportCategory) &&
                 !Object.keys(settings.filterBets).includes(settings.currentSportCategory))) {
                settings.currentSportCategory = 'Todos';
            }

            SPORTS_LIST.forEach(sport => {
                if (!settings.filterBets[sport]) {
                    settings.filterBets[sport] = {
                        active: true,
                        filters: sport === 'Todos' ? {...DEFAULT_FILTERS} : {},
                        customFilters: {}
                    };
                } else {
                    if (sport === 'Todos') {
                        const existingFilters = settings.filterBets[sport].filters || {};
                        settings.filterBets[sport].filters = {...DEFAULT_FILTERS};

                        Object.keys(existingFilters).forEach(filter => {
                            if (settings.filterBets[sport].filters.hasOwnProperty(filter)) {
                                settings.filterBets[sport].filters[filter] = existingFilters[filter];
                            }
                        });
                    }

                    if (!settings.filterBets[sport].customFilters) {
                        settings.filterBets[sport].customFilters = {};
                    }
                }
            });
            
            loadNotificationSound();

        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            initializeDefaultSettings();
        }
    }

    function initializeDefaultSettings() {
        settings = {
            filterBets: {},
            bettingHouses: {
                combinations: {},
                showOnlyFiltered: false
            },
            currentMainCategory: CATEGORIES.FILTER_BETS,
            currentSportCategory: 'Todos',
            calculator: {
                keepOddWithDifferentValues: false
            },
            notifications: {
                enabled: false,
                soundEnabled: false,
                soundBase64: null,
                soundFilename: null,
                delayBetweenAlerts: 300
            }
        };

        SPORTS_LIST.forEach(sport => {
            settings.filterBets[sport] = {
                active: true,
                filters: sport === 'Todos' ? {...DEFAULT_FILTERS} : {},
                customFilters: {}
            };
        });
    }

    function saveSettings() {
        try {
            GM_setValue('betsure_settings', settings);
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
        initializeDefaultSettings();

        try {
            GM_deleteValue('betsure_settings');
            GM_deleteValue('betsure_categorySettings');
            GM_deleteValue('betsure_currentCategory');
        } catch (error) {
            console.error('Erro ao resetar dados:', error);
        }

        saveSettings();

        if (document.getElementById('panel-content')) {
            updateUI();
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
            byCategory: {},
            byHouseCombination: {}
        };

        document.querySelectorAll('.hidden-bet').forEach(bet => {
            bet.classList.remove('hidden-bet');
        });

        const betContainers = document.querySelectorAll('span > div[id="1"]');

        betContainers.forEach(betContainer => {
            let betTypeText = '';
            let sportTypeText = 'Desconhecido';
            let teamNamesText = 'Times desconhecidos';
            let shouldHideByFilter = false;
            let shouldHideByHouse = false;
            let shouldShowByHouse = false;
            let housesInBet = [];

            const sportTypeElements = betContainer.querySelectorAll('p.text-xs.uppercase.tracking-wide.text-\\[white\\].font-bold');
            if (sportTypeElements.length > 0) {
                sportTypeText = sportTypeElements[0].textContent.trim();

                if (!settings.filterBets[sportTypeText]) {
                    settings.filterBets[sportTypeText] = {
                        active: true,
                        filters: {},
                        customFilters: {}
                    };
                    saveSettings();
                }
            }

            const houseElements = betContainer.querySelectorAll('span.mr-2.text-\\[\\#FFD700\\].font-semibold.text-sm');
            houseElements.forEach(element => {
                const houseText = element.textContent.trim();
                if (houseText && BETTING_HOUSES.includes(houseText)) {
                    housesInBet.push(houseText);
                }
            });

            const allSpans = betContainer.querySelectorAll('span');
            allSpans.forEach(span => {
                if (span.className.includes('text-[#FFD700]') && span.className.includes('font-semibold')) {
                    const houseText = span.textContent.trim();
                    if (houseText && BETTING_HOUSES.includes(houseText) && !housesInBet.includes(houseText)) {
                        housesInBet.push(houseText);
                    }
                }
            });

            const todosFilters = [];
            const categoryFilters = [];

            if (settings.filterBets['Todos']?.active) {
                Object.entries(settings.filterBets['Todos'].filters || {}).forEach(([filter, isActive]) => {
                    if (isActive) todosFilters.push(filter);
                });

                Object.entries(settings.filterBets['Todos'].customFilters || {}).forEach(([filter, isActive]) => {
                    if (isActive) todosFilters.push(filter);
                });
            }

            if (settings.filterBets[sportTypeText]?.active && sportTypeText !== 'Todos') {
                Object.entries(settings.filterBets[sportTypeText].filters || {}).forEach(([filter, isActive]) => {
                    if (isActive) categoryFilters.push(filter);
                });

                Object.entries(settings.filterBets[sportTypeText].customFilters || {}).forEach(([filter, isActive]) => {
                    if (isActive) categoryFilters.push(filter);
                });
            }

            const activeFilters = [...todosFilters, ...categoryFilters];

            if (activeFilters.length > 0) {
                const allBetTypeSpans = betContainer.querySelectorAll('span[class*="text-[#1e9622]"]');

                for (const span of allBetTypeSpans) {
                    const spanText = span.textContent.trim();

                    if (activeFilters.some(term => spanText.includes(term))) {
                        shouldHideByFilter = true;
                        betTypeText = spanText;
                        break;
                    }
                }

                if (!shouldHideByFilter) {
                    const allTextSpans = betContainer.querySelectorAll('span');
                    for (const span of allTextSpans) {
                        const spanText = span.textContent.trim();
                        if (activeFilters.some(term => spanText.includes(term))) {
                            shouldHideByFilter = true;
                            betTypeText = spanText;
                            break;
                        }
                    }
                }
            }

            if (housesInBet.length >= 2) {
                const combinationsToCheck = [];

                for (let i = 0; i < housesInBet.length; i++) {
                    for (let j = i + 1; j < housesInBet.length; j++) {
                        const combo1 = `${housesInBet[i]}|${housesInBet[j]}`;
                        const combo2 = `${housesInBet[j]}|${housesInBet[i]}`;
                        combinationsToCheck.push(combo1, combo2);
                    }
                }

                for (const combo of combinationsToCheck) {
                    const [house1, house2] = combo.split('|');
                    const comboKey = `${house1}|${house2}`;

                    if (settings.bettingHouses.combinations[comboKey]) {
                        const action = settings.bettingHouses.combinations[comboKey];

                        if (action === 'ignore') {
                            shouldHideByHouse = true;
                            filterStats.byHouseCombination[comboKey] = (filterStats.byHouseCombination[comboKey] || 0) + 1;
                        } else if (action === 'show') {
                            shouldShowByHouse = true;
                        }
                    }
                }
            }

            let shouldHide = shouldHideByFilter;

            if (settings.bettingHouses.showOnlyFiltered && housesInBet.length >= 2) {
                if (!shouldShowByHouse) {
                    shouldHide = true;
                }
            } else if (shouldHideByHouse) {
                shouldHide = true;
            }

            const teamNameElements = betContainer.querySelectorAll('span.text-white.w-\\[15rem\\]');
            if (teamNameElements.length > 0) {
                teamNamesText = teamNameElements[0].textContent.trim();
            }

            if (shouldHide) {
                betContainer.classList.add('hidden-bet');
                filterStats.total++;

                if (shouldHideByFilter) {
                    filterStats.byCategory[sportTypeText] = (filterStats.byCategory[sportTypeText] || 0) + 1;
                    console.log(`Ocultada por filtro: ${sportTypeText} - ${teamNamesText} - ${betTypeText}`);
                }

                if (shouldHideByHouse || (settings.bettingHouses.showOnlyFiltered && !shouldShowByHouse && housesInBet.length >= 2)) {
                    console.log(`Ocultada por combinação de casas: ${teamNamesText} - ${housesInBet.join(', ')}`);
                }
            }
        });

        updateStatusArea();
    }

    function updateStatusArea() {
        const statusArea = document.getElementById('status-area');
        if (!statusArea) return;

        let statusText = '';

        if (settings.currentMainCategory === CATEGORIES.FILTER_BETS) {
            if (settings.currentSportCategory !== 'Todos' && filterStats.total > 0) {
                const categoryCount = filterStats.byCategory[settings.currentSportCategory] || 0;
                statusText = `Ocultas: ${categoryCount} apostas em ${settings.currentSportCategory}`;
            }
            else if (filterStats.total > 0) {
                statusText = `Ocultas: ${filterStats.total} apostas no total`;

                if (settings.currentSportCategory === 'Todos') {
                    const categories = Object.keys(filterStats.byCategory).sort();
                    if (categories.length > 0) {
                        statusText += '\n';
                        statusText += categories.map(cat => `${cat}: ${filterStats.byCategory[cat]}`).join('\n');
                    }
                }
            } else {
                statusText = 'Nenhuma aposta oculta';
            }
        } else if (settings.currentMainCategory === CATEGORIES.BETTING_HOUSES) {
            if (filterStats.total > 0) {
                statusText = `Ocultas: ${filterStats.total} apostas no total\n`;

                const combinations = Object.keys(filterStats.byHouseCombination).sort();
                if (combinations.length > 0) {
                    statusText += combinations.map(combo => {
                        const [house1, house2] = combo.split('|');
                        return `${house1} x ${house2}: ${filterStats.byHouseCombination[combo]}`;
                    }).join('\n');
                }
            } else {
                statusText = 'Nenhuma aposta oculta';
            }
        } else if (settings.currentMainCategory === CATEGORIES.CALCULATOR) {
            statusText = 'Calculadora de apostas em odds diferentes';
        } else if (settings.currentMainCategory === CATEGORIES.SETTINGS) {
            statusText = 'Ferramenta BetterSafe by Zeus';
        }

        statusArea.textContent = statusText;
        statusArea.style.whiteSpace = 'pre-line';
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

        contentArea.innerHTML = '';

        if (settings.currentMainCategory === CATEGORIES.SETTINGS) {
            showSettingsContent(contentArea);
            return;
        } else if (settings.currentMainCategory === CATEGORIES.BETTING_HOUSES) {
            showBettingHousesContent(contentArea);
            return;
        } else if (settings.currentMainCategory === CATEGORIES.CALCULATOR) {
            showCalculatorContent(contentArea);
            return;
        }

        const category = settings.currentSportCategory;
        const categorySettings = settings.filterBets[category];

        const categoryToggle = document.createElement('div');
        categoryToggle.style.marginBottom = '15px';
        categoryToggle.style.display = 'flex';
        categoryToggle.style.alignItems = 'center';
        categoryToggle.style.justifyContent = 'space-between';

        const categoryLabel = document.createElement('span');
        categoryLabel.textContent = `Filtros para ${category}`;
        categoryLabel.style.fontWeight = 'bold';

        const categoryActiveCheckbox = createCustomCheckbox(
            categorySettings.active,
            (checked) => {
                settings.filterBets[category].active = checked;
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
            if (categorySettings.filters[filter] === undefined) {
                settings.filterBets[category].filters[filter] = false;
            }

            const filterCheckbox = createCustomCheckbox(
                categorySettings.filters[filter],
                (checked) => {
                    settings.filterBets[category].filters[filter] = checked;
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

        Object.entries(categorySettings.customFilters || {}).forEach(([filter, isActive]) => {
            const filterContainer = document.createElement('div');
            filterContainer.className = 'custom-filter-item';

            const filterCheckbox = createCustomCheckbox(
                isActive,
                (checked) => {
                    settings.filterBets[category].customFilters[filter] = checked;
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
                delete settings.filterBets[category].customFilters[filter];
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
            if (newFilter && !categorySettings.customFilters[newFilter]) {
                settings.filterBets[category].customFilters[newFilter] = true;
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

    function showBettingHousesContent(contentArea) {
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = 'Casas Combinadas';
        sectionTitle.style.marginTop = '0';
        sectionTitle.style.marginBottom = '15px';

        const showOnlyFilteredContainer = document.createElement('div');
        showOnlyFilteredContainer.style.marginBottom = '20px';

        const showOnlyFilteredCheckbox = createCustomCheckbox(
            settings.bettingHouses.showOnlyFiltered,
            (checked) => {
                settings.bettingHouses.showOnlyFiltered = checked;
                saveSettings();
                applyFilters();
            },
            'Mostrar somente casas filtradas'
        );

        showOnlyFilteredContainer.appendChild(showOnlyFilteredCheckbox);

        const addCombinationBtn = document.createElement('button');
        addCombinationBtn.className = 'add-combination-button';
        addCombinationBtn.textContent = '+ Nova Combinação';
        addCombinationBtn.addEventListener('click', () => {
            addNewHouseCombination();
        });

        const combinationsGrid = document.createElement('div');
        combinationsGrid.className = 'house-combination-grid';

        const statusArea = document.createElement('div');
        statusArea.id = 'status-area';
        statusArea.className = 'status-area';
        statusArea.style.marginTop = '20px';
        statusArea.textContent = 'Gerencie suas combinações de casas de apostas';

        contentArea.appendChild(sectionTitle);
        contentArea.appendChild(showOnlyFilteredContainer);
        contentArea.appendChild(addCombinationBtn);
        contentArea.appendChild(combinationsGrid);
        contentArea.appendChild(statusArea);

        updateHouseCombinationsGrid();
        updateStatusArea();
    }

    function updateHouseCombinationsGrid() {
        const grid = document.querySelector('.house-combination-grid');
        if (!grid) return;

        grid.innerHTML = '';

        Object.entries(settings.bettingHouses.combinations).forEach(([combination, action]) => {
            const [house1, house2] = combination.split('|');

            const combinationItem = createHouseCombinationItem(house1, house2, action);
            grid.appendChild(combinationItem);
        });

        if (Object.keys(settings.bettingHouses.combinations).length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'Nenhuma combinação definida. Clique em "+ Nova Combinação" para adicionar.';
            emptyMessage.style.gridColumn = '1 / -1';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.color = THEME.textSecondary;

            grid.appendChild(emptyMessage);
        }
    }

    function createHouseCombinationItem(house1, house2, action) {
        const item = document.createElement('div');
        item.className = 'house-combination-item';

        const header = document.createElement('div');
        header.className = 'house-combination-header';

        const title = document.createElement('div');
        title.className = 'house-combination-title';
        title.textContent = `${house1} × ${house2}`;

        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-filter';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remover combinação';
        removeBtn.addEventListener('click', () => {
            delete settings.bettingHouses.combinations[`${house1}|${house2}`];
            saveSettings();
            applyFilters();
            updateHouseCombinationsGrid();
        });

        header.appendChild(title);
        header.appendChild(removeBtn);

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'action-button-group';

        const showBtn = document.createElement('button');
        showBtn.className = `action-button show-button ${action === 'show' ? 'active' : ''}`;
        showBtn.textContent = 'Mostrar';
        showBtn.style.opacity = action === 'show' ? '1' : '0.7';
        showBtn.addEventListener('click', () => {
            settings.bettingHouses.combinations[`${house1}|${house2}`] = 'show';
            saveSettings();
            applyFilters();
            updateHouseCombinationsGrid();
        });

        const ignoreBtn = document.createElement('button');
        ignoreBtn.className = `action-button ignore-button ${action === 'ignore' ? 'active' : ''}`;
        ignoreBtn.textContent = 'Ignorar';
        ignoreBtn.style.opacity = action === 'ignore' ? '1' : '0.7';
        ignoreBtn.addEventListener('click', () => {
            settings.bettingHouses.combinations[`${house1}|${house2}`] = 'ignore';
            saveSettings();
            applyFilters();
            updateHouseCombinationsGrid();
        });

        buttonGroup.appendChild(showBtn);
        buttonGroup.appendChild(ignoreBtn);

        item.appendChild(header);
        item.appendChild(buttonGroup);

        return item;
    }

    function addNewHouseCombination() {
        const grid = document.querySelector('.house-combination-grid');
        if (!grid) return;

        const emptyMessage = grid.querySelector('div[style*="grid-column"]');
        if (emptyMessage) {
            emptyMessage.remove();
        }

        const newItem = document.createElement('div');
        newItem.className = 'house-combination-item';

        const header = document.createElement('div');
        header.className = 'house-combination-header';

        const title = document.createElement('div');
        title.className = 'house-combination-title';
        title.textContent = 'Nova Combinação';

        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-filter';
        removeBtn.textContent = '×';
        removeBtn.title = 'Cancelar';
        removeBtn.addEventListener('click', () => {
            newItem.remove();
            if (grid.childElementCount === 0) {
                updateHouseCombinationsGrid();
            }
        });

        header.appendChild(title);
        header.appendChild(removeBtn);

        const house1Select = document.createElement('select');
        house1Select.className = 'select-house';

        const house2Select = document.createElement('select');
        house2Select.className = 'select-house';

        const defaultOption1 = document.createElement('option');
        defaultOption1.value = '';
        defaultOption1.textContent = '-- Selecione Casa 1 --';
        house1Select.appendChild(defaultOption1);

        const defaultOption2 = document.createElement('option');
        defaultOption2.value = '';
        defaultOption2.textContent = '-- Selecione Casa 2 --';
        house2Select.appendChild(defaultOption2);

        BETTING_HOUSES.forEach(house => {
            const option1 = document.createElement('option');
            option1.value = house;
            option1.textContent = house;
            house1Select.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = house;
            option2.textContent = house;
            house2Select.appendChild(option2);
        });

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'action-button-group';
        buttonGroup.style.marginTop = '8px';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'action-button show-button';
        saveBtn.textContent = 'Salvar';
        saveBtn.addEventListener('click', () => {
            const house1 = house1Select.value;
            const house2 = house2Select.value;

            if (house1 && house2 && house1 !== house2) {
                const existingCombination =
                    settings.bettingHouses.combinations[`${house1}|${house2}`] ||
                    settings.bettingHouses.combinations[`${house2}|${house1}`];

                if (existingCombination) {
                    alert(`Combinação entre ${house1} e ${house2} já existe!`);
                    return;
                }

                settings.bettingHouses.combinations[`${house1}|${house2}`] = 'show';
                saveSettings();
                applyFilters();
                updateHouseCombinationsGrid();
            } else {
                alert('Selecione duas casas diferentes para criar uma combinação!');
            }
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'action-button ignore-button';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', () => {
            newItem.remove();
            if (grid.childElementCount === 0) {
                updateHouseCombinationsGrid();
            }
        });

        buttonGroup.appendChild(saveBtn);
        buttonGroup.appendChild(cancelBtn);

        newItem.appendChild(header);
        newItem.appendChild(house1Select);
        newItem.appendChild(house2Select);
        newItem.appendChild(buttonGroup);

        grid.appendChild(newItem);
    }

    function evaluateExpression(expr) {
        expr = expr.replace(/,/g, '.');
        expr = expr.trim();

        const simpleNumberPattern = /^-?\d+(\.\d+)?$/;
        if (simpleNumberPattern.test(expr)) {
            return parseFloat(expr);
        }

        const validExprPattern = /^-?\d+(\.\d+)?([+\-]\d+(\.\d+)?)*$/;
        if (!validExprPattern.test(expr)) {
            return null;
        }

        try {
            let result = 0;
            let currentOp = '+';
            let currentNum = '';

            for (let i = 0; i < expr.length; i++) {
                const char = expr[i];

                if (char === '+' || char === '-') {
                    if (currentNum) {
                        if (currentOp === '+') {
                            result += parseFloat(currentNum);
                        } else if (currentOp === '-') {
                            result -= parseFloat(currentNum);
                        }
                    }

                    currentOp = char;
                    currentNum = '';
                } else {
                    currentNum += char;
                }
            }

            if (currentNum) {
                if (currentOp === '+') {
                    result += parseFloat(currentNum);
                } else if (currentOp === '-') {
                    result -= parseFloat(currentNum);
                }
            }

            return result;
        } catch (e) {
            console.error('Erro ao avaliar expressão:', e);
            return null;
        }
    }

    function handleMathInput(e) {
        const input = e.target;
        const originalValue = input.value;

        if (originalValue.includes(',')) {
            input.value = originalValue.replace(/,/g, '.');
        }

        if (originalValue.includes('+') || (originalValue.includes('-') && originalValue.indexOf('-') > 0)) {
            if (e.type === 'input') return;

            if (e.type === 'blur' || (e.type === 'keydown' && e.key === 'Enter')) {
                const result = evaluateExpression(originalValue);
                if (result !== null) {
                    input.value = result.toFixed(2);
                    e.preventDefault();

                    input.dispatchEvent(new Event('change'));
                }
            }
        } else if (e.type === 'input') {
            setTimeout(() => {
                if (input.id === 'house1-odd' || input.id === 'house2-odd' ||
                    input.id === 'house1-amount' || input.id === 'house2-amount') {
                    calculateProfit();
                } else if (input.id === 'partial-bet-actual') {
                    calculateComplementaryBet();
                }
            }, 50);
        }
    }

    function showCalculatorContent(contentArea) {
        const calculatorContainer = document.createElement('div');
        calculatorContainer.className = 'calculator-section';

        GM_addStyle(`
            .partial-bet-section {
                margin-top: 15px;
                padding: 10px;
                background-color: ${THEME.bgMedium};
                border-radius: 3px;
                margin-bottom: 15px;
            }

            .partial-bet-header {
                font-weight: bold;
                margin-bottom: 10px;
                color: #FFF;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .partial-bet-toggle {
                display: flex;
                align-items: center;
            }

            .partial-bet-toggle input {
                margin-right: 5px;
            }

            .partial-bet-row {
                display: flex;
                margin-bottom: 10px;
                align-items: center;
            }

            .partial-bet-label {
                width: 70px;
                font-weight: bold;
            }

            .partial-bet-input {
                width: 100px;
                padding: 8px;
                background-color: #383838;
                color: white;
                border: 1px solid #444;
                border-radius: 3px;
                margin-right: 10px;
            }

            .house-selector {
                background-color: #383838;
                color: white;
                border: 1px solid #444;
                border-radius: 3px;
                padding: 8px;
                margin-left: 10px;
            }

            .complementary-info {
                margin-top: 10px;
                padding: 10px;
                background-color: #1A1A1A;
                border-radius: 3px;
                display: none;
            }

            .complementary-info.visible {
                display: block;
            }

            .loss {
                color: #ff6b6b;
                font-weight: bold;
            }
        `);

        const house1Row = document.createElement('div');
        house1Row.className = 'bet-row';

        const house1Label = document.createElement('div');
        house1Label.className = 'house-label';
        house1Label.textContent = 'Casa 1';

        const house1InputGroup = document.createElement('div');
        house1InputGroup.className = 'input-group';

        const house1OddInput = document.createElement('input');
        house1OddInput.type = 'text';
        house1OddInput.className = 'odd-input';
        house1OddInput.id = 'house1-odd';
        house1OddInput.placeholder = 'Odd';
        house1OddInput.value = calculatorValues.house1Odd || '';

        house1OddInput.addEventListener('input', handleMathInput);
        house1OddInput.addEventListener('blur', handleMathInput);
        house1OddInput.addEventListener('keydown', handleMathInput);

        house1OddInput.addEventListener('change', (e) => {
            calculatorValues.house1Odd = parseFloat(e.target.value) || 0;
            saveCalculatorValues();
            calculateProfit();
        });

        const house1AmountInput = document.createElement('input');
        house1AmountInput.type = 'text';
        house1AmountInput.className = 'amount-input';
        house1AmountInput.id = 'house1-amount';
        house1AmountInput.placeholder = 'Valor';
        house1AmountInput.value = calculatorValues.house1Amount || '';

        house1AmountInput.addEventListener('input', handleMathInput);
        house1AmountInput.addEventListener('blur', handleMathInput);
        house1AmountInput.addEventListener('keydown', handleMathInput);

        house1AmountInput.addEventListener('change', (e) => {
            calculatorValues.house1Amount = parseFloat(e.target.value) || 0;
            saveCalculatorValues();
            calculateProfit();
        });

        const house1Profit = document.createElement('div');
        house1Profit.className = 'profit-display';
        house1Profit.id = 'house1-profit';

        house1InputGroup.appendChild(house1OddInput);
        house1InputGroup.appendChild(house1AmountInput);

        house1Row.appendChild(house1Label);
        house1Row.appendChild(house1InputGroup);
        house1Row.appendChild(house1Profit);

        calculatorContainer.appendChild(house1Row);

        const house2Row = document.createElement('div');
        house2Row.className = 'bet-row';

        const house2Label = document.createElement('div');
        house2Label.className = 'house-label';
        house2Label.textContent = 'Casa 2';

        const house2InputGroup = document.createElement('div');
        house2InputGroup.className = 'input-group';

        const house2OddInput = document.createElement('input');
        house2OddInput.type = 'text';
        house2OddInput.className = 'odd-input';
        house2OddInput.id = 'house2-odd';
        house2OddInput.placeholder = 'Odd';
        house2OddInput.value = calculatorValues.house2Odd || '';

        house2OddInput.addEventListener('input', handleMathInput);
        house2OddInput.addEventListener('blur', handleMathInput);
        house2OddInput.addEventListener('keydown', handleMathInput);

        house2OddInput.addEventListener('change', (e) => {
            calculatorValues.house2Odd = parseFloat(e.target.value) || 0;
            saveCalculatorValues();
            calculateProfit();
        });

        const house2AmountInput = document.createElement('input');
        house2AmountInput.type = 'text';
        house2AmountInput.className = 'amount-input';
        house2AmountInput.id = 'house2-amount';
        house2AmountInput.placeholder = 'Valor';
        house2AmountInput.value = calculatorValues.house2Amount || '';

        house2AmountInput.addEventListener('input', handleMathInput);
        house2AmountInput.addEventListener('blur', handleMathInput);
        house2AmountInput.addEventListener('keydown', handleMathInput);

        house2AmountInput.addEventListener('change', (e) => {
            calculatorValues.house2Amount = parseFloat(e.target.value) || 0;
            saveCalculatorValues();
            calculateProfit();
        });

        const house2Profit = document.createElement('div');
        house2Profit.className = 'profit-display';
        house2Profit.id = 'house2-profit';

        house2InputGroup.appendChild(house2OddInput);
        house2InputGroup.appendChild(house2AmountInput);

        house2Row.appendChild(house2Label);
        house2Row.appendChild(house2InputGroup);
        house2Row.appendChild(house2Profit);

        calculatorContainer.appendChild(house2Row);

        const adjustmentInfo = document.createElement('div');
        adjustmentInfo.className = 'adjustment-info';
        adjustmentInfo.id = 'adjustment-info';
        calculatorContainer.appendChild(adjustmentInfo);

        const partialBetSection = document.createElement('div');
        partialBetSection.className = 'partial-bet-section';
        partialBetSection.id = 'partial-bet-section';

        const partialBetHeader = document.createElement('div');
        partialBetHeader.className = 'partial-bet-header';

        const partialBetTitle = document.createElement('div');
        partialBetTitle.textContent = 'Aposta Parcial (quando não consegue apostar valor total)';

        const partialBetToggle = document.createElement('div');
        partialBetToggle.className = 'partial-bet-toggle';

        const partialBetCheckbox = document.createElement('input');
        partialBetCheckbox.type = 'checkbox';
        partialBetCheckbox.id = 'partial-bet-toggle';

        const partialBetLabel = document.createElement('label');
        partialBetLabel.htmlFor = 'partial-bet-toggle';
        partialBetLabel.textContent = 'Ativar';

        partialBetToggle.appendChild(partialBetCheckbox);
        partialBetToggle.appendChild(partialBetLabel);

        partialBetHeader.appendChild(partialBetTitle);
        partialBetHeader.appendChild(partialBetToggle);

        const partialBetContent = document.createElement('div');
        partialBetContent.id = 'partial-bet-content';
        partialBetContent.style.display = 'none';

        const houseSelector = document.createElement('div');
        houseSelector.className = 'partial-bet-row';

        const houseSelectorLabel = document.createElement('div');
        houseSelectorLabel.className = 'partial-bet-label';
        houseSelectorLabel.textContent = 'Casa:';

        const houseSelectorInput = document.createElement('select');
        houseSelectorInput.className = 'house-selector';
        houseSelectorInput.id = 'partial-house-selector';

        const house1Option = document.createElement('option');
        house1Option.value = '1';
        house1Option.textContent = 'Casa 1';

        const house2Option = document.createElement('option');
        house2Option.value = '2';
        house2Option.textContent = 'Casa 2';
        house2Option.selected = true;

        houseSelectorInput.appendChild(house1Option);
        houseSelectorInput.appendChild(house2Option);

        houseSelector.appendChild(houseSelectorLabel);
        houseSelector.appendChild(houseSelectorInput);

        const actualAmountRow = document.createElement('div');
        actualAmountRow.className = 'partial-bet-row';

        const actualAmountLabel = document.createElement('div');
        actualAmountLabel.className = 'partial-bet-label';
        actualAmountLabel.textContent = 'Valor atual:';

        const actualAmountInput = document.createElement('input');
        actualAmountInput.type = 'text';
        actualAmountInput.className = 'partial-bet-input';
        actualAmountInput.id = 'partial-bet-actual';
        actualAmountInput.placeholder = 'Valor aceito';

        actualAmountInput.addEventListener('input', handleMathInput);
        actualAmountInput.addEventListener('blur', handleMathInput);
        actualAmountInput.addEventListener('keydown', handleMathInput);

        actualAmountRow.appendChild(actualAmountLabel);
        actualAmountRow.appendChild(actualAmountInput);

        const complementaryInfo = document.createElement('div');
        complementaryInfo.className = 'complementary-info';
        complementaryInfo.id = 'complementary-info';

        partialBetContent.appendChild(houseSelector);
        partialBetContent.appendChild(actualAmountRow);
        partialBetContent.appendChild(complementaryInfo);

        partialBetSection.appendChild(partialBetHeader);
        partialBetSection.appendChild(partialBetContent);

        partialBetCheckbox.addEventListener('change', function() {
            partialBetContent.style.display = this.checked ? 'block' : 'none';
            calculatorValues.partialBet.active = this.checked;

            if (this.checked) {
                calculateComplementaryBet();
            } else {
                complementaryInfo.innerHTML = '';
                complementaryInfo.classList.remove('visible');
            }

            saveCalculatorValues();
        });

        houseSelectorInput.addEventListener('change', function() {
            calculatorValues.partialBet.house = this.value;
            saveCalculatorValues();
            calculateComplementaryBet();
        });

        actualAmountInput.addEventListener('input', handleMathInput);
        actualAmountInput.addEventListener('blur', handleMathInput);
        actualAmountInput.addEventListener('keydown', handleMathInput);

        actualAmountInput.addEventListener('change', function() {
            calculatorValues.partialBet.actualAmount = parseFloat(this.value) || 0;
            saveCalculatorValues();
            calculateComplementaryBet();
        });

        if (calculatorValues.partialBet && calculatorValues.partialBet.active) {
            partialBetCheckbox.checked = true;
            partialBetContent.style.display = 'block';

            if (calculatorValues.partialBet.house) {
                houseSelectorInput.value = calculatorValues.partialBet.house;
            }

            if (calculatorValues.partialBet.actualAmount) {
                actualAmountInput.value = calculatorValues.partialBet.actualAmount;
            }

            setTimeout(calculateComplementaryBet, 100);
        }

        calculatorContainer.appendChild(partialBetSection);

        const totalRow = document.createElement('div');
        totalRow.className = 'total-row';

        const loadButton = document.createElement('button');
        loadButton.className = 'load-button';
        loadButton.textContent = 'Carregar da Página';
        loadButton.addEventListener('click', loadValuesFromPage);

        const totalInvestmentElem = document.createElement('div');
        totalInvestmentElem.className = 'total-info';
        totalInvestmentElem.id = 'total-investment';

        totalRow.appendChild(loadButton);
        totalRow.appendChild(totalInvestmentElem);
        calculatorContainer.appendChild(totalRow);

        const statusArea = document.createElement('div');
        statusArea.id = 'status-area';
        statusArea.className = 'status-area';
        statusArea.textContent = '';

        contentArea.appendChild(calculatorContainer);
        contentArea.appendChild(statusArea);

        calculateProfit();

        updateStatusArea();
    }

    function loadValuesFromPage() {
        try {
            let houseNames = ['Casa 1', 'Casa 2'];

            const oddInputs = document.querySelectorAll('input[placeholder="odd"]');
            const stackInputs = document.querySelectorAll('input[placeholder="stack"]');

            const houseNameElements = document.querySelectorAll('span.mr-2.flex.gap-2.text-\\[12px\\].items-center.text-yellow-500');
            if (houseNameElements.length >= 2) {
                houseNames[0] = houseNameElements[0].textContent.trim() || 'Casa 1';
                houseNames[1] = houseNameElements[1].textContent.trim() || 'Casa 2';
            }

            if (houseNames[0] === 'Casa 1' && houseNames[1] === 'Casa 2') {
                const yellowTextElements = document.querySelectorAll('span.text-\\[\\#FFD700\\], span.text-yellow-500');
                for (let i = 0; i < yellowTextElements.length && i < 2; i++) {
                    const text = yellowTextElements[i].textContent.trim();
                    if (text && BETTING_HOUSES.includes(text)) {
                        houseNames[i] = text;
                    }
                }
            }

            if (houseNames[0] !== 'Casa 1') {
                const house1Label = document.querySelector('.house-label:first-child');
                if (house1Label) {
                    house1Label.textContent = houseNames[0];
                }
            }

            if (houseNames[1] !== 'Casa 2') {
                const house2Label = document.querySelectorAll('.house-label')[1];
                if (house2Label) {
                    house2Label.textContent = houseNames[1];
                }
            }

            const houseSelector = document.getElementById('partial-house-selector');
            if (houseSelector) {
                if (houseSelector.options.length >= 2) {
                    houseSelector.options[0].textContent = houseNames[0];
                    houseSelector.options[1].textContent = houseNames[1];
                }
            }

            if (oddInputs.length >= 2 && stackInputs.length >= 2) {
                const oddValue1 = parseFloat(oddInputs[0].value) || 0;
                const oddValue2 = parseFloat(oddInputs[1].value) || 0;
                const stackValue1 = parseFloat(stackInputs[0].value) || 0;
                const stackValue2 = parseFloat(stackInputs[1].value) || 0;

                if (oddValue1 > 0) {
                    document.getElementById('house1-odd').value = oddValue1;
                    calculatorValues.house1Odd = oddValue1;
                }

                if (oddValue2 > 0) {
                    document.getElementById('house2-odd').value = oddValue2;
                    calculatorValues.house2Odd = oddValue2;
                }

                if (stackValue1 > 0) {
                    document.getElementById('house1-amount').value = stackValue1;
                    calculatorValues.house1Amount = stackValue1;
                }

                if (stackValue2 > 0) {
                    document.getElementById('house2-amount').value = stackValue2;
                    calculatorValues.house2Amount = stackValue2;
                }

                saveCalculatorValues();
                calculateProfit();

                const statusArea = document.getElementById('status-area');
                statusArea.textContent = 'Valores carregados com sucesso!';
                setTimeout(() => {
                    statusArea.textContent = '';
                }, 2000);
            } else {
                const oddInputs = document.querySelectorAll('input.input[value]');
                if (oddInputs.length >= 4) {
                    let odds = [];
                    let amounts = [];

                    oddInputs.forEach(input => {
                        if (input.value && input.className.includes('max-w-[5rem]')) {
                            const value = parseFloat(input.value) || 0;
                            if (value > 1) {
                                odds.push(value);
                            } else {
                                amounts.push(value);
                            }
                        }
                    });

                    if (odds.length >= 2 && amounts.length >= 2) {
                        document.getElementById('house1-odd').value = odds[0];
                        document.getElementById('house2-odd').value = odds[1];
                        document.getElementById('house1-amount').value = amounts[0];
                        document.getElementById('house2-amount').value = amounts[1];

                        calculatorValues.house1Odd = odds[0];
                        calculatorValues.house2Odd = odds[1];
                        calculatorValues.house1Amount = amounts[0];
                        calculatorValues.house2Amount = amounts[1];

                        saveCalculatorValues();
                        calculateProfit();

                        const statusArea = document.getElementById('status-area');
                        statusArea.textContent = 'Valores carregados com sucesso!';
                        setTimeout(() => {
                            statusArea.textContent = '';
                        }, 2000);
                        return;
                    }
                }

                const statusArea = document.getElementById('status-area');
                statusArea.textContent = 'Não foi possível encontrar valores na página!';
                setTimeout(() => {
                    statusArea.textContent = '';
                }, 2000);
            }
        } catch (error) {
            console.log('Erro ao tentar obter valores da página:', error);
            const statusArea = document.getElementById('status-area');
            statusArea.textContent = 'Erro ao carregar valores!';
            setTimeout(() => {
                statusArea.textContent = '';
            }, 2000);
        }
    }

    function calculateProfit() {
        const house1Odd = parseFloat(document.getElementById('house1-odd').value) || 0;
        const house1Amount = parseFloat(document.getElementById('house1-amount').value) || 0;
        const house2Odd = parseFloat(document.getElementById('house2-odd').value) || 0;
        const house2Amount = parseFloat(document.getElementById('house2-amount').value) || 0;

        calculatorValues.house1Odd = house1Odd;
        calculatorValues.house1Amount = house1Amount;
        calculatorValues.house2Odd = house2Odd;
        calculatorValues.house2Amount = house2Amount;
        saveCalculatorValues();

        const house1ProfitElem = document.getElementById('house1-profit');
        const house2ProfitElem = document.getElementById('house2-profit');
        const adjustmentInfo = document.getElementById('adjustment-info');
        const totalInvestmentElem = document.getElementById('total-investment');

        house1ProfitElem.innerHTML = '';
        house2ProfitElem.innerHTML = '';
        totalInvestmentElem.textContent = '';
        adjustmentInfo.innerHTML = '';
        adjustmentInfo.classList.remove('visible');

        if (house1Odd <= 1 || house2Odd <= 1 || house1Amount <= 0 || house2Amount <= 0) {
            return;
        }

        const totalInvestment = house1Amount + house2Amount;
        const returnHouse1 = house1Amount * house1Odd;
        const returnHouse2 = house2Amount * house2Odd;

        const profitHouse1 = returnHouse1 - totalInvestment;
        const profitHouse2 = returnHouse2 - totalInvestment;

        const percentHouse1 = (profitHouse1 / totalInvestment) * 100;
        const percentHouse2 = (profitHouse2 / totalInvestment) * 100;

        const optimalProfit = (returnHouse1 + returnHouse2) / 2 - totalInvestment;

        const profitHouse1Color = profitHouse1 >= 0 ? "profit" : "loss";
        const profitHouse2Color = profitHouse2 >= 0 ? "profit" : "loss";

        house1ProfitElem.innerHTML = `
            <div>Lucro: <span class="${profitHouse1Color}">R$ ${profitHouse1.toFixed(2)}</span></div>
            <div class="${profitHouse1Color}" style="font-size: 12px; margin-top: 2px;">(${percentHouse1.toFixed(2)}%)</div>
        `;

        house2ProfitElem.innerHTML = `
            <div>Lucro: <span class="${profitHouse2Color}">R$ ${profitHouse2.toFixed(2)}</span></div>
            <div class="${profitHouse2Color}" style="font-size: 12px; margin-top: 2px;">(${percentHouse2.toFixed(2)}%)</div>
        `;

        totalInvestmentElem.textContent = `Total investido: R$ ${totalInvestment.toFixed(2)}`;

        if (profitHouse1 < 0 || profitHouse2 < 0) {
            adjustmentInfo.classList.add('visible');

            if (profitHouse1 < profitHouse2) {
                const idealHouse1Amount = (house2Amount * house2Odd - house1Amount) / (house1Odd - 1);
                const additionalAmount = Math.max(0, idealHouse1Amount - house1Amount);
                const newHouse1Amount = house1Amount + additionalAmount;
                const newTotalAmount = newHouse1Amount + house2Amount;
                const expectedProfit = (newHouse1Amount * house1Odd) - newTotalAmount;
                const expectedProfitPercent = (expectedProfit / newTotalAmount) * 100;

                const noLossHouse1Amount = totalInvestment / house1Odd;
                const noLossAdditionalAmount = Math.max(0, noLossHouse1Amount - house1Amount);

                adjustmentInfo.innerHTML = `
                    <div class="equalize">Para lucros iguais, FALTAM R$ ${additionalAmount.toFixed(2)} [R$ ${newTotalAmount.toFixed(2)}] na Casa 1 para ter o lucro de R$ ${expectedProfit.toFixed(2)} (${expectedProfitPercent.toFixed(2)}%)</div>
                    <div class="no-loss">Para evitar perdas, FALTAM R$ ${noLossAdditionalAmount.toFixed(2)} [R$ ${(totalInvestment + noLossAdditionalAmount).toFixed(2)}] na Casa 1</div>
                `;
            } else if (profitHouse2 < profitHouse1) {
                const idealHouse2Amount = (house1Amount * house1Odd - house2Amount) / (house2Odd - 1);
                const additionalAmount = Math.max(0, idealHouse2Amount - house2Amount);
                const newHouse2Amount = house2Amount + additionalAmount;
                const newTotalAmount = house1Amount + newHouse2Amount;
                const expectedProfit = (newHouse2Amount * house2Odd) - newTotalAmount;
                const expectedProfitPercent = (expectedProfit / newTotalAmount) * 100;

                const noLossHouse2Amount = totalInvestment / house2Odd;
                const noLossAdditionalAmount = Math.max(0, noLossHouse2Amount - house2Amount);

                adjustmentInfo.innerHTML = `
                    <div class="equalize">Para lucros iguais, FALTAM R$ ${additionalAmount.toFixed(2)} [R$ ${newTotalAmount.toFixed(2)}] na Casa 2 para ter o lucro de R$ ${expectedProfit.toFixed(2)} (${expectedProfitPercent.toFixed(2)}%)</div>
                    <div class="no-loss">Para evitar perdas, FALTAM R$ ${noLossAdditionalAmount.toFixed(2)} [R$ ${(totalInvestment + noLossAdditionalAmount).toFixed(2)}] na Casa 2</div>
                `;
            }
        }

        calculateComplementaryBet();
    }

    function calculateComplementaryBet() {
        const partialBetCheckbox = document.getElementById('partial-bet-toggle');
        if (!partialBetCheckbox || !partialBetCheckbox.checked) return;

        const complementaryInfo = document.getElementById('complementary-info');
        if (!complementaryInfo) return;

        const house1Odd = parseFloat(document.getElementById('house1-odd').value) || 0;
        const house1Amount = parseFloat(document.getElementById('house1-amount').value) || 0;
        const house2Odd = parseFloat(document.getElementById('house2-odd').value) || 0;
        const house2Amount = parseFloat(document.getElementById('house2-amount').value) || 0;

        const houseSelector = document.getElementById('partial-house-selector');
        const selectedHouse = houseSelector ? houseSelector.value : '2';

        const actualAmountInput = document.getElementById('partial-bet-actual');
        const actualAmount = parseFloat(actualAmountInput ? actualAmountInput.value : 0) || 0;

        complementaryInfo.innerHTML = '';
        complementaryInfo.classList.remove('visible');

        if (house1Odd <= 1 || house2Odd <= 1 || house1Amount <= 0 || house2Amount <= 0 || actualAmount <= 0) {
            return;
        }

        if (selectedHouse === '1') {
            if (actualAmount >= house1Amount) {
                complementaryInfo.innerHTML = `<div style="color: orange;">O valor atual (${actualAmount.toFixed(2)}) já é maior que o valor planejado (${house1Amount.toFixed(2)}).</div>`;
                complementaryInfo.classList.add('visible');
                return;
            }

            const originalReturnHouse1 = house1Amount * house1Odd;
            const originalReturnHouse2 = house2Amount * house2Odd;
            const originalTotalInvestment = house1Amount + house2Amount;
            const originalProfitIfHouse1Wins = originalReturnHouse1 - originalTotalInvestment;
            const originalProfitIfHouse2Wins = originalReturnHouse2 - originalTotalInvestment;
            const originalPercent = (originalProfitIfHouse1Wins / originalTotalInvestment) * 100;

            const missingForOriginalProfit = house1Amount - actualAmount;
            const currentTotalInvestment = actualAmount + house2Amount;

            const minRequiredHouse1 = currentTotalInvestment / house1Odd;
            const additionalForNoLoss = Math.max(0, minRequiredHouse1 - actualAmount);
            const newTotalWithNoLoss = actualAmount + additionalForNoLoss + house2Amount;

            complementaryInfo.innerHTML = `
                <div class="equalize">Para manter o lucro original de R$ ${originalProfitIfHouse1Wins.toFixed(2)} (${originalPercent.toFixed(2)}%), FALTAM R$ ${missingForOriginalProfit.toFixed(2)} na Casa 1</div>
                <div class="no-loss">Para evitar perdas, FALTAM R$ ${additionalForNoLoss.toFixed(2)} [R$ ${newTotalWithNoLoss.toFixed(2)}] na Casa 1</div>
            `;

        } else {
            if (actualAmount >= house2Amount) {
                complementaryInfo.innerHTML = `<div style="color: orange;">O valor atual (${actualAmount.toFixed(2)}) já é maior que o valor planejado (${house2Amount.toFixed(2)}).</div>`;
                complementaryInfo.classList.add('visible');
                return;
            }

            const originalReturnHouse1 = house1Amount * house1Odd;
            const originalReturnHouse2 = house2Amount * house2Odd;
            const originalTotalInvestment = house1Amount + house2Amount;
            const originalProfitIfHouse1Wins = originalReturnHouse1 - originalTotalInvestment;
            const originalProfitIfHouse2Wins = originalReturnHouse2 - originalTotalInvestment;
            const originalPercent = (originalProfitIfHouse2Wins / originalTotalInvestment) * 100;

            const missingForOriginalProfit = house2Amount - actualAmount;
            const currentTotalInvestment = house1Amount + actualAmount;

            const minRequiredHouse2 = currentTotalInvestment / house2Odd;
            const additionalForNoLoss = Math.max(0, minRequiredHouse2 - actualAmount);
            const newTotalWithNoLoss = house1Amount + actualAmount + additionalForNoLoss;

            complementaryInfo.innerHTML = `
                <div class="equalize">Para manter o lucro original de R$ ${originalProfitIfHouse2Wins.toFixed(2)} (${originalPercent.toFixed(2)}%), FALTAM R$ ${missingForOriginalProfit.toFixed(2)} na Casa 2</div>
                <div class="no-loss">Para evitar perdas, FALTAM R$ ${additionalForNoLoss.toFixed(2)} [R$ ${newTotalWithNoLoss.toFixed(2)}] na Casa 2</div>
            `;
        }

        complementaryInfo.classList.add('visible');
    }

    function showSettingsContent(contentArea) {
        const settingsTitle = document.createElement('h3');
        settingsTitle.textContent = 'Ajustes';
        settingsTitle.style.marginTop = '0';
        settingsTitle.style.marginBottom = '15px';

        const notificationSection = document.createElement('div');
        notificationSection.className = 'notification-settings';

        const notificationTitle = document.createElement('h4');
        notificationTitle.textContent = 'Notificações';
        notificationTitle.style.marginTop = '0';

        const notificationToggle = createCustomCheckbox(
            settings.notifications.enabled,
            (checked) => {
                settings.notifications.enabled = checked;
                saveSettings();
                updateNotificationSettings();
            },
            'Ativar notificações'
        );

        const soundToggle = createCustomCheckbox(
            settings.notifications.soundEnabled,
            (checked) => {
                settings.notifications.soundEnabled = checked;
                saveSettings();
                updateNotificationSettings();
            },
            'Notificação sonora'
        );

        const delayContainer = document.createElement('div');
        delayContainer.className = 'notification-input-group';

        const delayLabel = document.createElement('label');
        delayLabel.textContent = 'Delay entre notificações:';
        delayLabel.htmlFor = 'delay-input';

        const delayInput = document.createElement('input');
        delayInput.type = 'number';
        delayInput.id = 'delay-input';
        delayInput.className = 'delay-input';
        delayInput.min = '100';
        delayInput.max = '5000';
        delayInput.value = settings.notifications.delayBetweenAlerts;
        delayInput.addEventListener('change', () => {
            const value = parseInt(delayInput.value);
            if (value >= 100 && value <= 5000) {
                settings.notifications.delayBetweenAlerts = value;
                saveSettings();
            } else {
                delayInput.value = settings.notifications.delayBetweenAlerts;
            }
        });

        const delayUnit = document.createElement('span');
        delayUnit.textContent = 'ms';

        delayContainer.appendChild(delayLabel);
        delayContainer.appendChild(delayInput);
        delayContainer.appendChild(delayUnit);

        const fileContainer = document.createElement('div');
        fileContainer.className = 'file-input-container';

        const fileInputLabel = document.createElement('label');
        fileInputLabel.className = 'file-input-label';
        fileInputLabel.textContent = 'Selecionar arquivo de áudio';
        fileInputLabel.htmlFor = 'notification-sound';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'notification-sound';
        fileInput.className = 'file-input';
        fileInput.accept = 'audio/mp3,audio/mpeg';
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            if (file.size > 500000) {
                alert('O arquivo de áudio deve ter menos de 500KB');
                fileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const base64String = e.target.result.split(',')[1];
                    
                    settings.notifications.soundBase64 = base64String;
                    settings.notifications.soundFilename = file.name;
                    
                    saveSettings();
                    loadNotificationSound();
                    updateNotificationSettings();
                    
                    GM_notification({
                        title: 'BetSure Utils',
                        text: 'Som de notificação salvo com sucesso!',
                        timeout: 3000
                    });
                } catch (error) {
                    console.error('Erro ao processar arquivo de áudio:', error);
                    alert('Erro ao processar arquivo de áudio.');
                }
            };

            reader.readAsDataURL(file);
        });

        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = settings.notifications.soundFilename || 'Nenhum arquivo selecionado';

        const testButton = document.createElement('button');
        testButton.className = 'play-test-button';
        testButton.textContent = 'Testar Som';
        testButton.addEventListener('click', () => {
            if (notificationAudio) {
                const testAudio = notificationAudio.cloneNode();
                testAudio.play();
            } else {
                alert('Nenhum som de notificação configurado');
            }
        });

        fileContainer.appendChild(fileInputLabel);
        fileContainer.appendChild(fileInput);
        fileContainer.appendChild(fileName);
        fileContainer.appendChild(testButton);

        notificationSection.appendChild(notificationTitle);
        notificationSection.appendChild(notificationToggle);
        notificationSection.appendChild(soundToggle);
        notificationSection.appendChild(delayContainer);
        notificationSection.appendChild(fileContainer);

        function updateNotificationSettings() {
            soundToggle.style.display = settings.notifications.enabled ? 'flex' : 'none';
            delayContainer.style.display = settings.notifications.enabled && settings.notifications.soundEnabled ? 'flex' : 'none';
            fileContainer.style.display = settings.notifications.enabled && settings.notifications.soundEnabled ? 'flex' : 'none';
        }

        updateNotificationSettings();

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'settings-button-container';
        buttonsContainer.style.marginTop = '20px';

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
                const dataStr = JSON.stringify(settings, null, 2);
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

                    settings = importedSettings;

                    if (!settings.filterBets) {
                        settings.filterBets = {};
                    }

                    if (!settings.bettingHouses) {
                        settings.bettingHouses = {
                            combinations: {},
                            showOnlyFiltered: false
                        };
                    }

                    if (!settings.bettingHouses.combinations) {
                        settings.bettingHouses.combinations = {};
                    }

                    if (settings.bettingHouses.showOnlyFiltered === undefined) {
                        settings.bettingHouses.showOnlyFiltered = false;
                    }

                    if (!settings.calculator) {
                        settings.calculator = {
                            keepOddWithDifferentValues: false
                        };
                    }
                    
                    if (!settings.notifications) {
                        settings.notifications = {
                            enabled: false,
                            soundEnabled: false,
                            soundBase64: null,
                            soundFilename: null,
                            delayBetweenAlerts: 300
                        };
                    }

                    if (!settings.currentMainCategory) {
                        settings.currentMainCategory = CATEGORIES.FILTER_BETS;
                    }

                    if (!settings.currentSportCategory ||
                        (!SPORTS_LIST.includes(settings.currentSportCategory) &&
                         !Object.keys(settings.filterBets).includes(settings.currentSportCategory))) {
                        settings.currentSportCategory = 'Todos';
                    }

                    SPORTS_LIST.forEach(sport => {
                        if (!settings.filterBets[sport]) {
                            settings.filterBets[sport] = {
                                active: true,
                                filters: sport === 'Todos' ? {...DEFAULT_FILTERS} : {},
                                customFilters: {}
                            };
                        } else {
                            if (sport === 'Todos') {
                                const existingFilters = settings.filterBets[sport].filters || {};
                                settings.filterBets[sport].filters = {...DEFAULT_FILTERS};

                                Object.keys(existingFilters).forEach(filter => {
                                    if (settings.filterBets[sport].filters.hasOwnProperty(filter)) {
                                        settings.filterBets[sport].filters[filter] = existingFilters[filter];
                                    }
                                });
                            }

                            if (!settings.filterBets[sport].customFilters) {
                                settings.filterBets[sport].customFilters = {};
                            }
                        }
                    });

                    saveSettings();
                    loadNotificationSound();
                    updateUI();
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

        const statusArea = document.createElement('div');
        statusArea.id = 'status-area';
        statusArea.className = 'status-area';
        statusArea.style.marginTop = '20px';

        const versionInfo = document.createElement('div');
        versionInfo.textContent = `Versão ${CURRENT_VERSION}`;
        versionInfo.style.marginTop = '20px';
        versionInfo.style.fontSize = '12px';
        versionInfo.style.color = THEME.textSecondary;
        versionInfo.style.textAlign = 'center';

        buttonsContainer.appendChild(resetButton);
        buttonsContainer.appendChild(exportButton);
        buttonsContainer.appendChild(importButton);
        buttonsContainer.appendChild(importInput);

        contentArea.appendChild(settingsTitle);
        contentArea.appendChild(notificationSection);
        contentArea.appendChild(buttonsContainer);
        contentArea.appendChild(statusArea);
        contentArea.appendChild(versionInfo);

        updateStatusArea();
    }

    function createCategoryItem(category) {
        const isActive = category === settings.currentSportCategory;

        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.style.backgroundColor = isActive ? THEME.active : 'transparent';
        categoryItem.textContent = category.toUpperCase();

        categoryItem.addEventListener('click', () => {
            settings.currentSportCategory = category;
            saveSettings();
            updateSportCategoryList();
            updateCategoryContent();
        });

        return categoryItem;
    }

    function updateMainNavigation() {
        const mainNav = document.querySelector('.main-nav');
        if (!mainNav) return;

        mainNav.innerHTML = '';

        Object.entries(CATEGORIES).forEach(([key, category]) => {
            const navItem = document.createElement('div');
            navItem.className = 'main-nav-item';

            const icon = document.createElement('span');
            icon.className = 'icon';
            icon.textContent = CATEGORY_ICONS[key];

            const text = document.createElement('span');
            text.className = 'text';
            text.textContent = category;

            navItem.appendChild(icon);
            navItem.appendChild(text);

            if (category === settings.currentMainCategory) {
                navItem.classList.add('active');
            }

            navItem.addEventListener('click', () => {
                settings.currentMainCategory = category;
                saveSettings();
                updateUI();
                applyFilters();
            });

            mainNav.appendChild(navItem);
        });
    }

    function updateSportCategoryList() {
        const categoryList = document.getElementById('category-list');
        if (!categoryList) return;

        categoryList.innerHTML = '';

        const todosItem = createCategoryItem('Todos');
        categoryList.appendChild(todosItem);

        const allCategories = new Set([
            ...SPORTS_LIST.filter(cat => cat !== 'Todos' && cat !== 'Configurações'),
            ...Object.keys(settings.filterBets).filter(cat => cat !== 'Todos' && cat !== 'Configurações')
        ]);

        [...allCategories].sort().forEach(category => {
            const categoryItem = createCategoryItem(category);
            categoryList.appendChild(categoryItem);
        });
    }

    function updateUI() {
        updateMainNavigation();

        if (settings.currentMainCategory === CATEGORIES.FILTER_BETS) {
            document.querySelector('.category-column').style.display = 'flex';
            updateSportCategoryList();
        } else {
            document.querySelector('.category-column').style.display = 'none';
        }

        updateCategoryContent();
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

        const mainNav = document.createElement('div');
        mainNav.className = 'main-nav';

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

        categoryListContainer.appendChild(categoryList);
        categoryColumn.appendChild(categoryListContainer);

        const contentColumn = document.createElement('div');
        contentColumn.id = 'category-content';

        content.appendChild(categoryColumn);
        content.appendChild(contentColumn);

        panel.appendChild(header);
        panel.appendChild(mainNav);
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
                mainNav.style.display = 'flex';
                content.style.display = 'flex';
                toggleBtn.textContent = '−';
            } else {
                panel.setAttribute('data-full-height', `${panel.offsetHeight}px`);
                content.style.display = 'none';
                mainNav.style.display = 'none';
                panel.classList.add('minimized');
                toggleBtn.textContent = '+';
            }
        });

        updateUI();
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            loadSettings();
            addControlPanel();
            applyFilters();
            checkForUpdates();
        }, 1500);
    });

    function checkForNewBets(mutations) {
        if (!settings.notifications.enabled) return;
        
        let newBetsFound = false;
        const betContainers = document.querySelectorAll('span > div[id="1"]');
        
        betContainers.forEach(betContainer => {
            const betId = generateBetId(betContainer);
            
            if (!knownBets.has(betId)) {
                knownBets.add(betId);
                
                if (!betContainer.classList.contains('hidden-bet')) {
                    newBetsFound = true;
                }
            }
        });
        
        if (knownBets.size > 500) {
            const betsArray = Array.from(knownBets);
            knownBets = new Set(betsArray.slice(betsArray.length - 500));
        }
        
        if (newBetsFound && settings.notifications.soundEnabled) {
            playNotificationSound();
        }
    }
    
    function generateBetId(betElement) {
        let idParts = [];
        
        const teamElements = betElement.querySelectorAll('span.text-white.w-\\[15rem\\]');
        if (teamElements.length > 0) {
            idParts.push(teamElements[0].textContent.trim());
        }
        
        const oddElements = betElement.querySelectorAll('span.text-\\[\\#1e9622\\]');
        if (oddElements.length > 0) {
            oddElements.forEach(odd => {
                idParts.push(odd.textContent.trim());
            });
        }
        
        const houseElements = betElement.querySelectorAll('span.mr-2.text-\\[\\#FFD700\\].font-semibold.text-sm');
        if (houseElements.length > 0) {
            houseElements.forEach(house => {
                idParts.push(house.textContent.trim());
            });
        }
        
        idParts.push(new Date().toISOString().split('T')[0]);
        
        return idParts.join('|');
    }

    const observer = new MutationObserver((mutations) => {
        setTimeout(() => {
            applyFilters();
            checkForNewBets(mutations);
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