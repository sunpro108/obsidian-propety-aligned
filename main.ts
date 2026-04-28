import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface PropertyFillerSettings {
  templateFilePath: string;
}

const DEFAULT_SETTINGS: PropertyFillerSettings = {
  templateFilePath: 'Templates/属性模板.md'
};

export default class PropertyFillerPlugin extends Plugin {
  settings: PropertyFillerSettings;

  async onload() {
    await this.loadSettings();
    this.addRibbonIcon('sparkles', '根据模板补全属性', () => {
      this.fillPropertiesByTemplate();
    });
    this.addSettingTab(new PropertyFillerSettingTab(this.app, this));
  }

  async fillPropertiesByTemplate() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension!== 'md') {
      alert('请打开一个 Markdown 文件');
      return;
    }

    const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templateFilePath);
    if (!(templateFile instanceof TFile)) {
      alert('未找到模板文件，请检查路径');
      return;
    }

    // 读取属性（使用 metadataCache）
    const templateProps = this.app.metadataCache.getFileCache(templateFile)?.frontmatter || {};
    const currentProps = this.app.metadataCache.getFileCache(activeFile)?.frontmatter || {};

    const merged = this.mergeProperties(templateProps, currentProps);
    const newFrontmatter = this.buildFormattedFrontmatter(merged);

    console.log('🔥 属性模板：', templateProps);
    console.log('🔥 当前属性：', currentProps)
    console.log('🔥 新属性：', merged)  
    console.log('🔥 新属性（格式化）：', newFrontmatter)

    let content = await this.app.vault.read(activeFile);
    if (content.startsWith('---\n')) {
      content = content.replace(/^---\n[\s\S]*?\n---\n/, newFrontmatter);
    } else {
      content = newFrontmatter + content;
    }

    await this.app.vault.modify(activeFile, content);
    console.log('✅ 属性已按模板补全（引号自动添加）');
  }

  mergeProperties(template: Record<string, any>, current: Record<string, any>) {
    const result: Record<string, any> = {};

    // 1. 按模板顺序
    for (const key of Object.keys(template)) {
      if (current.hasOwnProperty(key)) {
        result[key] = current[key];
      } else {
        result[key] = template[key];
      }
    }

    // 2. 现有独有属性放最后
    for (const key of Object.keys(current)) {
      if (!template.hasOwnProperty(key)) {
        result[key] = current[key];
      }
    }

    return result;
  }

  // ==============================
  // 【你要的全部规则在这里】
  // 1. 空值 → ""
  // 2. 非空 → "原值"
  // 3. 数组 → 无序列表，每项加 ""
  // ==============================
  buildFormattedFrontmatter(props: Record<string, any>): string {
    let fm = '---\n';

    for (const key in props) {
      if (key === 'position') continue;
      let val = props[key];

      // --------------------------
      // 数组：转无序列表
      // --------------------------
      if (Array.isArray(val)) {
        fm += `${key}:\n`;
        if (val.length === 0) {
          fm += `  - ""\n`;
        } else {
          val.forEach(item => {
            if (item === null || item === undefined || item === '') {
              fm += `  - ""\n`;
            } else {
              fm += `  - "${item}"\n`;
            }
          });
        }
        continue;
      }

      // --------------------------
      // 普通值：空→""，非空→"值"
      // --------------------------
      if (val === null || val === undefined || val === '') {
        fm += `${key}: ""\n`;
      } else {
        fm += `${key}: "${val}"\n`;
      }
    }

    fm += '---\n';
    return fm;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class PropertyFillerSettingTab extends PluginSettingTab {
  constructor(app: App, public plugin: PropertyFillerPlugin) {
    super(app, plugin);
  }

  display() {
    this.containerEl.empty();
    new Setting(this.containerEl)
     .setName('属性模板文件路径')
     .setDesc('例如：Templates/属性模板.md')
     .addText(text => text
       .setValue(this.plugin.settings.templateFilePath)
       .onChange(async v => {
          this.plugin.settings.templateFilePath = v;
          await this.plugin.saveSettings();
        })
      );
  }
}