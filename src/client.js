/* Classic-script entry consumed by Harness's native client module loader. */
window.__ModuleLoader__.load({
  id: 'dsh-theme-neon-arcade',
  factory(require) {
    const React = require('react');
    const { FishLogo } = require('@deepseek-ai/dsh-client-ui-primitives');
    const h = React.createElement;
    const CSS = __THEME_CSS__;
    const TOKENS = __THEME_TOKENS__;
    __AIR_BATTLE_RUNTIME__
    __PIG_SLING_RUNTIME__
    const ID = 'dsh-theme-neon-arcade';
    const KEY = `${ID}:v1`;
    const ATTRS = ['data-neon-arcade', 'data-neon-arcade-glow', 'data-neon-arcade-grid', 'data-neon-arcade-scanlines', 'data-neon-arcade-decorations', 'data-neon-arcade-game'];
    const DEFAULTS = Object.freeze({enabled: true, glow: true, grid: true, scanlines: false, decorations: true, game: false, gameKind: 'air', pigNight: true});
    const inject = ['theme', 'slots', 'shortcuts'];

    function loadPreferences() {
      try {
        const value = JSON.parse(localStorage.getItem(KEY));
        return Object.fromEntries(Object.entries(DEFAULTS).map(([k,v]) => [k, k==='gameKind'
          ? (['air','pigs'].includes(value?.[k])?value[k]:v) : (typeof value?.[k] === 'boolean' ? value[k] : v)]));
      } catch { return {...DEFAULTS}; }
    }

    function PixelWhale({size = 48, className = ''}) {
      return h('svg', {width: size, height: size, viewBox: '0 0 32 32', className: `na-mascot ${className}`, 'aria-hidden': true, shapeRendering: 'crispEdges'},
        h('path', {className: 'na-sprite-offset', d: 'M7 10h15v3h3v3h4v-3h3v8h-7v4H10v-3H6v-4H3v-5h4z', transform: 'translate(0 2)'}),
        h('path', {fill: 'currentColor', d: 'M7 10h15v3h3v3h4v-3h3v8h-7v4H10v-3H6v-4H3v-5h4z'}),
        h('path', {fill: '#090817', d: 'M9 13h3v3H9zM16 19h5v2h-5z'}),
        h('path', {fill: '#b5f86e', d: 'M11 3h3v3h-3zM17 1h3v3h-3zM20 5h3v3h-3z'}));
    }

    function apply(ctx) {
      // Desktop embeds this renderer; the same profile's HTTP UI must stay untouched.
      if (typeof document === 'undefined' || ctx.shortcuts.runtime !== 'desktop') return;
      const root = document.documentElement;
      let preferences = Object.freeze(loadPreferences());
      const listeners = new Set();
      const snapshot = () => preferences;
      const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
      let removeTokens;
      let active = false;
      let disposed = false;
      let airBattle;
      let runtimeKind;

      const renderPreferences = () => {
        if (disposed) return;
        if (preferences.enabled !== active) {
          active = preferences.enabled;
          if (active) removeTokens = ctx.theme.overrideTokens(ID, TOKENS);
          else { removeTokens?.(); removeTokens = undefined; }
        }
        for (const [i, key] of ['enabled', 'glow', 'grid', 'scanlines', 'decorations', 'game'].entries()) {
          root.toggleAttribute(ATTRS[i], preferences.enabled && preferences[key]);
        }
        if (runtimeKind!==preferences.gameKind) {
          airBattle?.dispose();
          runtimeKind=preferences.gameKind;
          airBattle=runtimeKind==='pigs'?createPigSlingBackground({doc:document,win:window,night:preferences.pigNight,
            onNightChange:night=>update({pigNight:night})}):createAirBattleBackground({doc:document,win:window});
        }
        if (runtimeKind==='pigs') airBattle?.setNight(preferences.pigNight);
        airBattle?.setEnabled(preferences.enabled && preferences.game);
      };
      const update = patch => {
        preferences = Object.freeze({...preferences, ...patch});
        try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch { /* Session-only if storage is unavailable. */ }
        renderPreferences();
        for (const fn of listeners) fn();
      };
      const usePreferences = () => React.useSyncExternalStore(subscribe, snapshot, snapshot);
      const toggle = (key, label, disabled, prefs) => h('div', {className: 'na-setting', key},
        h('label', {htmlFor: `na-${key}`}, label),
        h('button', {id: `na-${key}`, type: 'button', role: 'switch', className: 'na-toggle', 'aria-label': label,
          'aria-checked': prefs[key], disabled, onClick: () => update({[key]: !prefs[key]})}, h('span')));

      function AppearancePanel() {
        const prefs = usePreferences();
        return h('section', {className: 'na-settings', 'aria-label': '霓虹像素电玩主题'},
          h('div', {className: 'na-settings-head'}, h(PixelWhale, {size: 38}), h('div', null,
            h('div', {className: 'na-wordmark'}, 'NEON ARCADE'),
            h('div', {className: 'na-desc'}, '霓虹像素电玩 · 桌面主题'))),
          h('div', {className: 'na-settings-sub'},
            toggle('enabled', '启用霓虹像素主题', false, prefs),
            toggle('game', '启用小游戏背景', !prefs.enabled, prefs),
            h('div',{className:'na-setting',key:'gameKind'},
              h('label',{htmlFor:'na-game-kind'},'游戏选择'),
              h('select',{id:'na-game-kind',className:'na-game-select','aria-label':'游戏选择',value:prefs.gameKind,disabled:!prefs.enabled,
                onChange:event=>{if(['air','pigs'].includes(event.target.value))update({gameKind:event.target.value});}},
                h('option',{value:'air'},'像素空战'),h('option',{value:'pigs'},'愤怒的小猪'))),
            toggle('glow', '霓虹辉光', !prefs.enabled, prefs),
            toggle('grid', '像素网格', !prefs.enabled, prefs),
            toggle('scanlines', 'CRT 扫描线', !prefs.enabled, prefs),
            toggle('decorations', '像素街机点缀', !prefs.enabled, prefs)),
          h('div', {className: 'na-setting-note'}, prefs.gameKind==='pigs'
            ? '默认霓虹夜晚，画布右上角可切换白天 / 夜晚并记住选择。点击「参与游戏」，拖住底部小猪拉弓，松开发射；小猪无限供应。点击「退出参与」或按 Esc 恢复聊天。'
            : '点击「参与游戏」，按住鼠标拖动战机，自动射击、中弹无限复活。点击「退出参与」或按 Esc 恢复聊天。'));
      }
      function Footer({wide}) {
        const prefs = usePreferences();
        return h('button', {type: 'button', className: 'na-footer', 'data-active': prefs.enabled,
          title: prefs.enabled ? '霓虹像素主题已开启 · 点击关闭' : '点击开启霓虹像素主题',
          'aria-label': prefs.enabled ? '关闭霓虹像素主题' : '开启霓虹像素主题', 'aria-pressed': prefs.enabled,
          onClick: () => update({enabled: !prefs.enabled})},
          h('span', {className: 'na-footer-dot', 'aria-hidden': true}), wide ? (prefs.enabled ? 'NEON ARCADE' : 'NEON / OFF') : 'N');
      }
      function HeroMark(props) {
        const prefs = usePreferences();
        return prefs.enabled ? h(PixelWhale, props) : h(FishLogo, props);
      }

      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.plugin = ID;
        tag.dataset.pluginCss = `${ID}/theme.css`;
        tag.textContent = CSS;
        document.head.appendChild(tag);
        renderPreferences();
        return () => {
          disposed = true;
          airBattle?.dispose();
          airBattle = undefined;
          removeTokens?.();
          removeTokens = undefined;
          active = false;
          for (const attr of ATTRS) root.removeAttribute(attr);
          tag.remove();
          listeners.clear();
        };
      }, `${ID}: theme lifetime`);
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item', id: `${ID}.appearance`, order: 10.5
      }, AppearancePanel));
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action', id: `${ID}.status`, order: 90
      }, Footer));
      ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({
        name: 'conversation.hero.brand.mark', id: `${ID}.whale`
      }, HeroMark));
    }
    return {name: ID, inject, apply};
  }
});
