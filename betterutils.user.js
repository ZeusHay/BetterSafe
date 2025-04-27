// ==UserScript==
// @name         BetterUtils
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Utilities for betting websites
// @author       Zeus
// @match        https://www.bet365.bet.br/*
// @match        *://*.bet365.*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    // Estado global de abertura/fechamento
    let marketsOpen = false;
    
    function addToggleButton() {
        // Remover botão existente se houver
        const existingBtn = document.getElementById('betterutils-toggle-button');
        if (existingBtn) existingBtn.remove();
        
        // Botão único para abrir/fechar
        const toggleButton = document.createElement('button');
        toggleButton.id = 'betterutils-toggle-button';
        toggleButton.textContent = 'ABRIR MERCADOS';
        toggleButton.style.cssText = `
            position: fixed;
            bottom: 15px;
            right: 15px;
            z-index: 9999999;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 10px 15px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        `;
        
        // Evento de toggle
        toggleButton.addEventListener('click', function() {
            if (!marketsOpen) {
                // Abrir todos
                expandAllMarkets();
                toggleButton.textContent = 'FECHAR MERCADOS';
                toggleButton.style.backgroundColor = '#dc3545';
                marketsOpen = true;
            } else {
                // Fechar todos
                closeAllMarkets();
                toggleButton.textContent = 'ABRIR MERCADOS';
                toggleButton.style.backgroundColor = '#28a745';
                marketsOpen = false;
            }
        });
        
        document.body.appendChild(toggleButton);
    }
    
    // Verifica se é um botão seguro para clicar (não causa navegação)
    function isSafeButton(element) {
        // Ignorar botões que claramente não são de mercados
        if (!element || !element.classList) return false;
        
        // Lista de classes e atributos de botões que NÃO devem ser clicados
        const unsafeClasses = [
            'hm-BigButtons', 'hm-', 'um-', 'wl-', 'bs-', 'qb-', 'mi-',
            'Login', 'Search', 'Tab', 'Nav', 'Menu', 'Link', 'Deposit',
            'Header', 'Footer', 'Join', 'Close', 'Minimize'
        ];
        
        // Verificar se tem alguma classe insegura
        const className = element.className || '';
        if (unsafeClasses.some(cls => className.includes(cls))) return false;
        
        // Verificar se tem atributos de navegação
        if (element.hasAttribute('href') || 
            element.tagName === 'A' || 
            element.getAttribute('role') === 'link') return false;
            
        // Verificar se está dentro de um elemento de navegação
        if (element.closest('nav, header, footer, .hm-MainHeaderMembersNonMember, .hm-MainHeaderCentreWide')) return false;
        
        return true;
    }
    
    function isMarketClosed(element) {
        if (!isSafeButton(element)) return false;
        
        // Verifica se o elemento tem classes de abertura
        if (element.classList.contains('sip-MarketGroup_Open') || 
            element.classList.contains('cm-MarketGroup_Open') || 
            element.classList.contains('oog-FixtureSubGroup_Open')) {
            return false;
        }
        
        // Verifica padrões de classe mais genéricos para botões abertos
        const classNames = Array.from(element.classList);
        if (classNames.some(className => className.includes('_Open'))) {
            return false;
        }
        
        return true;
    }
    
    function isMarketOpen(element) {
        if (!isSafeButton(element)) return false;
        
        // Verifica se está aberto pela presença de classes específicas
        if (element.classList.contains('sip-MarketGroup_Open') || 
            element.classList.contains('cm-MarketGroup_Open') || 
            element.classList.contains('oog-FixtureSubGroup_Open')) {
            return true;
        }
        
        // Verifica padrões de classe mais genéricos para botões abertos
        const classNames = Array.from(element.classList);
        if (classNames.some(className => className.includes('_Open'))) {
            return true;
        }
        
        return false;
    }
    
    function clickElement(element) {
        if (!element || !isSafeButton(element)) return;
        
        try {
            element.click();
        } catch (e) {
            try {
                const evt = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                element.dispatchEvent(evt);
            } catch (e2) {}
        }
    }
    
    function getAllMarketButtons() {
        // Usamos seletores mais específicos, focados apenas em botões de mercado
        const selectors = [
            // Classes específicas conhecidas
            '.sip-MarketGroupButton:not([href])', 
            '.cm-MarketGroupWithIconsButton:not([href])',
            '.oog-FixtureSubGroupButton:not([href])',
            // Seletores mais restritos
            '[class*="MarketGroupButton"]:not([href]):not([role="link"])',
            '[class*="FixtureSubGroupButton"]:not([href]):not([role="link"])'
        ];
        
        const buttons = [];
        const allPotentialButtons = document.querySelectorAll(selectors.join(', '));
        
        // Filtramos os botões para garantir que são seguros
        allPotentialButtons.forEach(button => {
            if (isSafeButton(button)) {
                buttons.push(button);
            }
        });
        
        return buttons;
    }
    
    function expandAllMarkets() {
        const marketButtons = getAllMarketButtons();
        
        for (let button of marketButtons) {
            if (isMarketClosed(button)) {
                clickElement(button);
            }
        }
    }
    
    function closeAllMarkets() {
        const marketButtons = getAllMarketButtons();
        
        for (let button of marketButtons) {
            if (isMarketOpen(button)) {
                clickElement(button);
            }
        }
    }
    
    // Inicializa após 3 segundos
    setTimeout(addToggleButton, 3000);
})(); 