// index.js - Main Entry Point
import * as Constants from './constants.js';
import { sharedState, setMenuVisible } from './state.js';
import { 
    createMenuElement, 
    toggleOriginalQuickReplyBar, 
    initializeOriginalQuickReplyBarStyle,
    updateMenuVisibilityUI 
} from './ui.js';
import { createSettingsHtml } from './settings.js';
import { 
    setupEventListeners, 
    handleQuickReplyClick, 
    updateMenuStylesUI 
} from './events.js';

// 创建本地设置对象，如果全局对象不存在
if (typeof window.extension_settings === 'undefined') {
    window.extension_settings = {};
}
if (!window.extension_settings[Constants.EXTENSION_NAME]) {
    window.extension_settings[Constants.EXTENSION_NAME] = {
        enabled: true,
        iconType: Constants.ICON_TYPES.ROCKET,
        customIconUrl: '',
        matchButtonColors: true,
        // 添加默认菜单样式
        menuStyles: JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES))
    };
}

// 导出设置对象以便其他模块使用
export const extension_settings = window.extension_settings;

/**
 * Injects the rocket button next to the send button
 */
function injectRocketButton() {
    console.log('Injecting rocket button'); // 添加日志
    const sendButton = document.getElementById('send_but');
    if (!sendButton) {
        console.error(`[${Constants.EXTENSION_NAME}] Could not find send button to inject rocket button`);
        return null;
    }
    
    // 创建按钮
    const button = document.createElement('div');
    button.id = Constants.ID_ROCKET_BUTTON;
    button.className = 'interactable secondary-button fa-solid fa-rocket';
    button.title = '快速回复菜单';
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', Constants.ID_MENU);
    
    // 插入按钮
    sendButton.parentNode.insertBefore(button, sendButton);
    
    return button;
}

/**
 * 更新图标显示 - 使用CSS背景图像
 */
function updateIconDisplay() {
    const button = sharedState.domElements.rocketButton;
    if (!button) return;
    
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    const iconType = settings.iconType || Constants.ICON_TYPES.ROCKET;
    
    // 清除按钮内容和样式
    button.innerHTML = '';
    button.className = 'interactable secondary-button';
    button.style.backgroundImage = '';
    button.style.backgroundSize = '';
    button.style.backgroundPosition = '';
    button.style.backgroundRepeat = '';
    
    // 根据图标类型设置内容
    if (iconType === Constants.ICON_TYPES.CUSTOM && settings.customIconUrl) {
        const customContent = settings.customIconUrl.trim();
        
        // 使用CSS背景图像显示
        if (customContent.startsWith('<svg') && customContent.includes('</svg>')) {
            // SVG代码 - 转换为Data URL
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(customContent);
            button.style.backgroundImage = `url('${svgDataUrl}')`;
            button.style.backgroundSize = '20px 20px';
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        } 
        else if (customContent.startsWith('data:') || 
                customContent.startsWith('http') || 
                customContent.endsWith('.png') || 
                customContent.endsWith('.jpg') || 
                customContent.endsWith('.svg') ||
                customContent.endsWith('.gif')) {
            // URL或完整的Data URL
            button.style.backgroundImage = `url('${customContent}')`;
            button.style.backgroundSize = '20px 20px';
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        } 
        else if (customContent.includes('base64,')) {
            // 不完整的base64，尝试补全
            let imgUrl = customContent;
            if (!customContent.startsWith('data:')) {
                imgUrl = 'data:image/png;base64,' + customContent.split('base64,')[1];
            }
            button.style.backgroundImage = `url('${imgUrl}')`;
            button.style.backgroundSize = '20px 20px';
            button.style.backgroundPosition = 'center';
            button.style.backgroundRepeat = 'no-repeat';
        } else {
            // 不是可识别的格式，使用文本显示
            button.textContent = '?';
            console.warn(`[${Constants.EXTENSION_NAME}] 无法识别的图标格式`);
        }
    } else {
        // 使用FontAwesome图标
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
        button.classList.add('fa-solid', iconClass);
    }
    
    // 应用颜色设置
    if (settings.matchButtonColors) {
        const sendButton = document.getElementById('send_but');
        if (sendButton) {
            button.style.color = getComputedStyle(sendButton).color;
            if (sendButton.classList.contains('primary-button')) {
                button.classList.remove('secondary-button');
                button.classList.add('primary-button');
            }
        }
    }
}

/**
 * 更新图标预览 - 使用CSS背景图像
 */
function updateIconPreview(iconType) {
    const previewContainer = document.querySelector(`.${Constants.CLASS_ICON_PREVIEW}`);
    if (!previewContainer) return;
    
    // 清除内容和样式
    previewContainer.innerHTML = '';
    previewContainer.style.backgroundImage = '';
    previewContainer.style.backgroundSize = '';
    previewContainer.style.backgroundPosition = '';
    previewContainer.style.backgroundRepeat = '';
    
    const settings = window.extension_settings[Constants.EXTENSION_NAME];
    
    if (iconType === Constants.ICON_TYPES.CUSTOM) {
        const customContent = settings.customIconUrl?.trim() || '';
        
        if (!customContent) {
            previewContainer.innerHTML = '<span>(无预览)</span>';
            return;
        }
        
        // 使用CSS背景图像显示
        if (customContent.startsWith('<svg') && customContent.includes('</svg>')) {
            // SVG代码 - 转换为Data URL
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(customContent);
            previewContainer.style.backgroundImage = `url('${svgDataUrl}')`;
            previewContainer.style.backgroundSize = '20px 20px';
            previewContainer.style.backgroundPosition = 'center';
            previewContainer.style.backgroundRepeat = 'no-repeat';
        } 
        else if (customContent.startsWith('data:') || 
                customContent.startsWith('http') || 
                customContent.endsWith('.png') || 
                customContent.endsWith('.jpg') || 
                customContent.endsWith('.svg') ||
                customContent.endsWith('.gif')) {
            // URL或完整的Data URL
            previewContainer.style.backgroundImage = `url('${customContent}')`;
            previewContainer.style.backgroundSize = '20px 20px';
            previewContainer.style.backgroundPosition = 'center';
            previewContainer.style.backgroundRepeat = 'no-repeat';
        } 
        else if (customContent.includes('base64,')) {
            // 不完整的base64，尝试补全
            let imgUrl = customContent;
            if (!customContent.startsWith('data:')) {
                imgUrl = 'data:image/png;base64,' + customContent.split('base64,')[1];
            }
            previewContainer.style.backgroundImage = `url('${imgUrl}')`;
            previewContainer.style.backgroundSize = '20px 20px';
            previewContainer.style.backgroundPosition = 'center';
            previewContainer.style.backgroundRepeat = 'no-repeat';
        } else {
            previewContainer.innerHTML = '<span>(格式不支持)</span>';
        }
    } else {
        const iconClass = Constants.ICON_CLASS_MAP[iconType] || Constants.ICON_CLASS_MAP[Constants.ICON_TYPES.ROCKET];
        previewContainer.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    }
}

/**
 * Initializes the plugin: creates UI, sets up listeners, loads settings.
 */
function initializePlugin() {
    try {
        console.log(`[${Constants.EXTENSION_NAME}] Initializing...`);

        // Create and inject the rocket button
        const rocketButton = injectRocketButton();

        // Create menu element
        const menu = createMenuElement();

        // Store references in shared state
        sharedState.domElements.rocketButton = rocketButton;
        sharedState.domElements.menu = menu;
        sharedState.domElements.chatItemsContainer = menu.querySelector(`#${Constants.ID_CHAT_ITEMS}`);
        sharedState.domElements.globalItemsContainer = menu.querySelector(`#${Constants.ID_GLOBAL_ITEMS}`);
        sharedState.domElements.settingsDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
        sharedState.domElements.iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
        sharedState.domElements.customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
        sharedState.domElements.colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);

        // 创建全局对象暴露事件处理函数
        // index.js 中的 window.quickReplyMenu.saveSettings 函数
        window.quickReplyMenu = {
            handleQuickReplyClick,
            saveSettings: function() {
                // 从DOM元素获取最新值
                const settings = extension_settings[Constants.EXTENSION_NAME];
                const enabledDropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
                const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
                const customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
                const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);
        
                // 更新设置值
                if (enabledDropdown) {
                    const isEnabled = enabledDropdown.value === 'true';
                    settings.enabled = isEnabled;
                    
                    // 根据启用状态切换显示
                    if (sharedState.domElements.rocketButton) {
                        sharedState.domElements.rocketButton.style.display = isEnabled ? '' : 'none';
                    }
                    
                    // 切换原始快捷回复栏的显示状态
                    toggleOriginalQuickReplyBar(!isEnabled);
                    
                    // 如果禁用，确保菜单是关闭的
                    if (!isEnabled) {
                        setMenuVisible(false);
                        updateMenuVisibilityUI();
                    }
                }
        
                if (iconTypeDropdown) settings.iconType = iconTypeDropdown.value;
                if (customIconUrl) settings.customIconUrl = customIconUrl.value;
                if (colorMatchCheckbox) settings.matchButtonColors = colorMatchCheckbox.checked;
        
                // 更新图标
                updateIconDisplay();
        
                // 更新图标预览
                updateIconPreview(settings.iconType);
        
                // 更新菜单样式
                if (typeof updateMenuStylesUI === 'function' && settings.menuStyles) {
                    updateMenuStylesUI();
                }
        
                // 保存到 localStorage 作为备份
                try {
                    localStorage.setItem('QRA_settings', JSON.stringify(settings));
                } catch(e) {
                    console.error('保存到localStorage失败:', e);
                }
        
                // 尝试使用 context API 保存
                if (typeof context !== 'undefined' && context.saveExtensionSettings) {
                    try {
                        context.saveExtensionSettings();
                        console.log('设置已通过API保存');
                    } catch(e) {
                        console.error('通过API保存设置失败:', e);
                    }
                } else {
                    console.warn('context.saveExtensionSettings 不可用');
                }
        
                // 显示保存成功的反馈
                const saveStatus = document.getElementById('qr-save-status');
                if (saveStatus) {
                    saveStatus.textContent = '✓ 设置已保存';
                    setTimeout(() => {
                        saveStatus.textContent = '';
                    }, 2000);
                }
        
                const saveButton = document.getElementById('qr-save-settings');
                if (saveButton) {
                    const originalText = saveButton.innerHTML;
                    saveButton.innerHTML = '<i class="fa-solid fa-check"></i> 已保存';
                    saveButton.style.backgroundColor = '#4caf50';
                    setTimeout(() => {
                        saveButton.innerHTML = originalText;
                        saveButton.style.backgroundColor = '';
                    }, 2000);
                }
        
                return true;
            }
        };

        // Append menu to the body
        document.body.appendChild(menu);

        // Load settings and apply UI
        loadAndApplySettings();

        // Setup event listeners
        setupEventListeners();

        // 设置文件上传事件监听器
        setupFileUploadListener();

        // 初始化原始快捷回复栏的状态
        initializeOriginalQuickReplyBarStyle();

        console.log(`[${Constants.EXTENSION_NAME}] Initialization complete.`);
    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] 初始化失败:`, err);
    }
}

/**
 * 添加文件上传事件监听器
 */
function setupFileUploadListener() {
    const fileInput = document.getElementById('icon-file-upload');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
                if (customIconUrl) {
                    customIconUrl.value = e.target.result; // 将文件转为base64

                    // 更新设置
                    const settings = extension_settings[Constants.EXTENSION_NAME];
                    settings.customIconUrl = e.target.result;

                    // 更新预览
                    if (settings.iconType === Constants.ICON_TYPES.CUSTOM) {
                        updateIconPreview(Constants.ICON_TYPES.CUSTOM);
                    }

                    // 更新图标显示
                    updateIconDisplay();

                    // 保存设置
                    if (typeof context !== 'undefined' && context.saveExtensionSettings) {
                        context.saveExtensionSettings();
                    } else {
                        console.log(`[${Constants.EXTENSION_NAME}] 设置已更新（模拟保存）`);
                    }
                }
            };
            reader.readAsDataURL(file);
        });

        console.log(`[${Constants.EXTENSION_NAME}] File upload listener set up`);
    } else {
        console.warn(`[${Constants.EXTENSION_NAME}] File upload input not found`);
    }
}

/**
 * Loads initial settings and applies them.
 */
function loadAndApplySettings() {
    // 确保设置对象存在并设置默认值
    const settings = window.extension_settings[Constants.EXTENSION_NAME];

    // 设置默认值
    settings.enabled = settings.enabled !== false; // 默认启用
    settings.iconType = settings.iconType || Constants.ICON_TYPES.ROCKET; // 默认火箭图标
    settings.customIconUrl = settings.customIconUrl || ''; // 默认空URL
    settings.matchButtonColors = settings.matchButtonColors !== false; // 默认匹配颜色

    // 应用设置到UI元素
    const dropdown = document.getElementById(Constants.ID_SETTINGS_ENABLED_DROPDOWN);
    if (dropdown) {
        dropdown.value = String(settings.enabled);
    }
    
    // 设置图标类型下拉框
    const iconTypeDropdown = document.getElementById(Constants.ID_ICON_TYPE_DROPDOWN);
    if (iconTypeDropdown) {
        iconTypeDropdown.value = settings.iconType;
        
        // 显示或隐藏自定义图标URL输入框
        const customIconContainer = document.querySelector('.custom-icon-container');
        if (customIconContainer) {
            customIconContainer.style.display = settings.iconType === Constants.ICON_TYPES.CUSTOM ? 'flex' : 'none';
        }
    }
    
    // 设置自定义图标URL
    const customIconUrl = document.getElementById(Constants.ID_CUSTOM_ICON_URL);
    if (customIconUrl) {
        customIconUrl.value = settings.customIconUrl;
    }
    
    // 设置颜色匹配复选框
    const colorMatchCheckbox = document.getElementById(Constants.ID_COLOR_MATCH_CHECKBOX);
    if (colorMatchCheckbox) {
        colorMatchCheckbox.checked = settings.matchButtonColors;
    }
    
    // 设置文件上传事件监听器
    setupSettingsEventListeners();
    
    // 处理禁用/启用状态
    if (settings.enabled === false) {
        // 禁用插件时：隐藏火箭按钮，显示原始快捷回复栏
        if (sharedState.domElements.rocketButton) {
            sharedState.domElements.rocketButton.style.display = 'none';
        }
        // 显示原始快捷回复栏
        const originalBar = document.getElementById('qr--bar');
        if (originalBar) {
            originalBar.classList.remove('qr-bar-hidden');
        }
    } else {
        // 启用插件时：显示火箭按钮，隐藏原始快捷回复栏
        if (sharedState.domElements.rocketButton) {
            sharedState.domElements.rocketButton.style.display = '';
        }
        // 隐藏原始快捷回复栏
        const originalBar = document.getElementById('qr--bar');
        if (originalBar) {
            originalBar.classList.add('qr-bar-hidden');
        }
    }

    // 更新图标显示
    updateIconDisplay();

    // 应用菜单样式设置
    if (typeof updateMenuStylesUI === 'function' && settings.menuStyles) {
        updateMenuStylesUI();
    } else if (!settings.menuStyles) {
        // 如果没有定义菜单样式，设置默认值
        settings.menuStyles = JSON.parse(JSON.stringify(Constants.DEFAULT_MENU_STYLES));
    }

    console.log(`[${Constants.EXTENSION_NAME}] Settings loaded and applied. Enabled: ${settings.enabled}`);
}

// 确保 jQuery 可用 - 使用原生 js 备用
function onReady(callback) {
    if (typeof jQuery !== 'undefined') {
        jQuery(callback);
    } else if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(callback, 1);
    } else {
        document.addEventListener("DOMContentLoaded", callback);
    }
}

// 添加到 onReady 回调之前
function loadSettingsFromLocalStorage() {
    try {
        const savedSettings = localStorage.getItem('QRA_settings');
        if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);

            // 将保存的设置合并到当前设置
            const currentSettings = extension_settings[Constants.EXTENSION_NAME];
            Object.assign(currentSettings, parsedSettings);

            console.log('从localStorage加载了设置:', currentSettings);
            return true;
        }
    } catch(e) {
        console.error('从localStorage加载设置失败:', e);
    }
    return false;
}

// 在 onReady 回调中，在初始化插件之前调用
onReady(() => {
    try {
        // 确保设置面板存在
        const settingsContainer = document.getElementById('extensions_settings');
        if (!settingsContainer) {
            const div = document.createElement('div');
            div.id = 'extensions_settings';
            div.style.display = 'none';
            document.body.appendChild(div);
        }

        // 尝试从localStorage加载设置
        loadSettingsFromLocalStorage();

        // 添加设置面板内容
        document.getElementById('extensions_settings').innerHTML += createSettingsHtml();

        // 初始化插件
        initializePlugin();
    } catch (err) {
        console.error(`[${Constants.EXTENSION_NAME}] 启动失败:`, err);
    }
});
