/// <reference path="../../built/pxtlib.d.ts" />


namespace pxtblockly {
    export interface FieldTilemapOptions {
        initWidth: string;
        initHeight: string;
        disableResize: string;
        tileWidth: string | number;

        filter?: string;
    }

    interface ParsedFieldTilemapOptions {
        initWidth: number;
        initHeight: number;
        disableResize: boolean;
        tileWidth: 8 | 16 | 32;
        filter?: string;
    }

    export class FieldTilemap extends FieldAssetEditor<FieldTilemapOptions, ParsedFieldTilemapOptions> {
        protected initText: string;
        protected asset: pxt.ProjectTilemap;

        getInitText() {
            return this.initText;
        }

        getTileset() {
            return (this.asset as pxt.ProjectTilemap)?.data.tileset;
        }

        protected getAssetType(): pxt.AssetType {
            return pxt.AssetType.Tilemap;
        }

        protected createNewAsset(newText = ""): pxt.Asset {
            if (newText) {
                // backticks are escaped inside markdown content
                newText = newText.replace(/&#96;/g, "`");
            }

            const project = pxt.react.getTilemapProject();
            const match = /^\s*tilemap\s*`([^`]*)`\s*$/.exec(newText);

            if (match) {
                const tilemapId = match[1].trim();
                let resolved = project.lookupAssetByName(pxt.AssetType.Tilemap, tilemapId);

                if (!resolved) {
                    resolved = project.lookupAsset(pxt.AssetType.Tilemap, tilemapId);
                }

                if (resolved) {
                    return resolved;
                }
            }

            const tilemap = pxt.sprite.decodeTilemap(newText, "typescript", project) || project.blankTilemap(this.params.tileWidth, this.params.initWidth, this.params.initHeight);
            let newAsset: pxt.ProjectTilemap;

            // Ignore invalid bitmaps
            if (checkTilemap(tilemap)) {
                this.initText = newText;
                this.isGreyBlock = false;
                const [ name ] = project.createNewTilemapFromData(tilemap);
                newAsset = project.getTilemap(name);
            }
            else if (newText.trim()) {
                this.isGreyBlock = true;
                this.valueText = newText;
            }

            return newAsset;
        }

        protected onEditorClose(newValue: pxt.ProjectTilemap) {
            const result = newValue.data;
            const project = pxt.react.getTilemapProject();

            if (result.deletedTiles) {
                for (const deleted of result.deletedTiles) {
                    project.deleteTile(deleted);
                }
            }

            if (result.editedTiles) {
                for (const edit of result.editedTiles) {
                    const editedIndex = result.tileset.tiles.findIndex(t => t.id === edit);
                    const edited = result.tileset.tiles[editedIndex];

                    if (!edited) continue;

                    result.tileset.tiles[editedIndex] = project.updateTile(edited);
                }
            }

            for (let i = 0; i < result.tileset.tiles.length; i++) {
                const tile = result.tileset.tiles[i];

                if (!tile.jresData) {
                    result.tileset.tiles[i] = project.resolveTile(tile.id);
                }
            }

            pxt.sprite.trimTilemapTileset(result);
        }

        protected getValueText(): string {
            if (this.isGreyBlock) return pxt.Util.htmlUnescape(this.valueText);

            if (this.asset) {
                return `tilemap\`${this.asset.meta.displayName || this.asset.id}\``;
            }

            try {
                return pxt.sprite.encodeTilemap(this.asset.data, "typescript");
            }
            catch (e) {
                // If encoding failed, this is a legacy tilemap. Should get upgraded when the project is loaded
                return this.getInitText();
            }
        }

        protected parseFieldOptions(opts: FieldTilemapOptions): ParsedFieldTilemapOptions {
            return parseFieldOptions(opts);
        }
    }

    function parseFieldOptions(opts: FieldTilemapOptions) {
        const parsed: ParsedFieldTilemapOptions = {
            initWidth: 16,
            initHeight: 16,
            disableResize: false,
            tileWidth: 16
        };

        if (!opts) {
            return parsed;
        }

        if (opts.filter) {
            parsed.filter = opts.filter;
        }

        if (opts.tileWidth) {
            if (typeof opts.tileWidth === "number") {
                switch (opts.tileWidth) {
                    case 8:
                        parsed.tileWidth = 8;
                        break;
                    case 16:
                        parsed.tileWidth = 16;
                        break;
                    case 32:
                        parsed.tileWidth = 32;
                        break;
                }
            }
            else {
                const tw = opts.tileWidth.trim().toLowerCase();
                switch (tw) {
                    case "8":
                    case "eight":
                        parsed.tileWidth = 8;
                        break;
                    case "16":
                    case "sixteen":
                        parsed.tileWidth = 16;
                        break;
                    case "32":
                    case "thirtytwo":
                        parsed.tileWidth = 32;
                        break;
                }
            }
        }

        parsed.initWidth = withDefault(opts.initWidth, parsed.initWidth);
        parsed.initHeight = withDefault(opts.initHeight, parsed.initHeight);

        return parsed;

        function withDefault(raw: string, def: number) {
            const res = parseInt(raw);
            if (isNaN(res)) {
                return def;
            }
            return res;
        }
    }
    function checkTilemap(tilemap: pxt.sprite.TilemapData) {
        if (!tilemap || !tilemap.tilemap || !tilemap.tilemap.width || !tilemap.tilemap.height) return false;

        if (!tilemap.layers || tilemap.layers.width !== tilemap.tilemap.width || tilemap.layers.height !== tilemap.tilemap.height) return false;

        if (!tilemap.tileset) return false;

        return true;
    }
}
