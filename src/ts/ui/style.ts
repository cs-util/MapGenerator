import * as log from 'loglevel';
import * as dat from 'dat.gui';
import TensorFieldGUI from './tensor_field_gui';
import {NoiseParams} from '../impl/tensor_field';
import CanvasWrapper from './canvas_wrapper';
import {DefaultCanvasWrapper, RoughCanvasWrapper} from './canvas_wrapper';
import Util from '../util';
import PolygonUtil from '../impl/polygon_util';
import DragController from './drag_controller';
import DomainController from './domain_controller';
import Vector from '../vector';
import {BuildingModel} from './buildings';

export interface ColourScheme {
    bgColour: string;
    bgColourIn?: string;
    buildingColour?: string;
    buildingSideColour?: string;
    buildingStroke?: string;
    seaColour: string;
    grassColour?: string;
    minorRoadColour: string;
    minorRoadOutline?: string;
    majorRoadColour?: string;
    majorRoadOutline?: string;
    mainRoadColour?: string;
    mainRoadOutline?: string;
    outlineSize?: number;
    minorWidth?: number;
    majorWidth?: number;
    mainWidth?: number;
    zoomBuildings?: boolean;
    buildingModels?: boolean;
    frameColour?: string;
    frameTextColour?: string;
}

export default abstract class Style {
    protected canvas: CanvasWrapper;
    protected domainController: DomainController = DomainController.getInstance();
    public abstract createCanvasWrapper(c: HTMLCanvasElement, scale: number, resizeToWindow: boolean): CanvasWrapper;
    public abstract draw(canvas?: CanvasWrapper): void;

    public update(): void {}

    // Polygons
    public seaPolygon: Vector[] = [];
    public lots: Vector[][] = [];
    public buildingModels: BuildingModel[] = [];
    public parks: Vector[][] = [];

    // Polylines
    public coastline: Vector[] = [];
    public river: Vector[] = [];
    public secondaryRiver: Vector[] = [];
    public minorRoads: Vector[][] = [];
    public majorRoads: Vector[][] = [];
    public mainRoads: Vector[][] = [];
    public coastlineRoads: Vector[][] = [];
    public showFrame: boolean;

    constructor(protected dragController: DragController) {}

    public set canvasScale(scale: number) {
        this.canvas.canvasScale = scale;
    }

    public get needsUpdate(): boolean {
        return this.canvas.needsUpdate;
    }

    public set needsUpdate(n: boolean) {
        this.canvas.needsUpdate = n;
    }
}

export class DefaultStyle extends Style {
    constructor(c: HTMLCanvasElement, dragController: DragController, private colourScheme: ColourScheme) {
        super(dragController);

        // Default cascade
        if (!colourScheme.bgColourIn) colourScheme.bgColourIn = colourScheme.bgColour;
        if (!colourScheme.buildingColour) colourScheme.buildingColour = colourScheme.bgColour;
        if (!colourScheme.buildingStroke) colourScheme.buildingStroke = colourScheme.bgColour;
        if (!colourScheme.grassColour) colourScheme.grassColour = colourScheme.bgColour;
        if (!colourScheme.minorRoadOutline) colourScheme.minorRoadOutline = colourScheme.minorRoadColour;
        if (!colourScheme.majorRoadColour) colourScheme.majorRoadColour = colourScheme.minorRoadColour;
        if (!colourScheme.majorRoadOutline) colourScheme.majorRoadOutline = colourScheme.minorRoadOutline;
        if (!colourScheme.mainRoadColour) colourScheme.mainRoadColour = colourScheme.majorRoadColour;
        if (!colourScheme.mainRoadOutline) colourScheme.mainRoadOutline = colourScheme.majorRoadOutline;
        if (!colourScheme.outlineSize) colourScheme.outlineSize = 1;
        if (!colourScheme.zoomBuildings) colourScheme.zoomBuildings = false;
        if (!colourScheme.buildingModels) colourScheme.buildingModels = false;
        if (!colourScheme.minorWidth) colourScheme.minorWidth = 2;
        if (!colourScheme.majorWidth) colourScheme.majorWidth = 4;
        if (!colourScheme.mainWidth) colourScheme.mainWidth = 5;
        if (!colourScheme.mainWidth) colourScheme.mainWidth = 5;
        if (!colourScheme.frameColour) colourScheme.frameColour = colourScheme.bgColour;
        if (!colourScheme.frameTextColour) colourScheme.frameTextColour = colourScheme.minorRoadOutline;

        if (!colourScheme.buildingSideColour) {
            const parsedRgb = Util.parseCSSColor(colourScheme.buildingColour).map(v => Math.max(0, v - 40));
            if (parsedRgb) {
                colourScheme.buildingSideColour = `rgb(${parsedRgb[0]},${parsedRgb[1]},${parsedRgb[2]})`;
            } else {
                colourScheme.buildingSideColour = colourScheme.buildingColour;
            }
        }

        this.canvas = this.createCanvasWrapper(c, 1, true);
    }

    public createCanvasWrapper(c: HTMLCanvasElement, scale=1, resizeToWindow=true): CanvasWrapper {
        return new DefaultCanvasWrapper(c, scale, resizeToWindow);
    }

    set zoomBuildings(b: boolean) {
        this.colourScheme.zoomBuildings = b;
    }

    set showBuildingModels(b: boolean) {
        this.colourScheme.buildingModels = b;
    }

    get showBuildingModels(): boolean {
        return this.colourScheme.buildingModels;
    }

    public draw(canvas=this.canvas as DefaultCanvasWrapper): void {
        let bgColour;
        if (this.colourScheme.zoomBuildings) {
            bgColour = this.domainController.zoom >= 2 ? this.colourScheme.bgColourIn : this.colourScheme.bgColour;
        } else {
            bgColour = this.colourScheme.bgColour;
        }
        

        canvas.setFillStyle(bgColour);
        canvas.clearCanvas();

        // Sea
        canvas.setFillStyle(this.colourScheme.seaColour);
        canvas.setStrokeStyle(this.colourScheme.seaColour);
        canvas.setLineWidth(0.1);
        canvas.drawPolygon(this.seaPolygon);

        // Coastline
        canvas.setStrokeStyle(bgColour);
        canvas.setLineWidth(30 * this.domainController.zoom);
        canvas.drawPolyline(this.coastline);

        // Parks
        canvas.setLineWidth(1);
        canvas.setFillStyle(this.colourScheme.grassColour);
        for (const p of this.parks) canvas.drawPolygon(p);

        // River
        canvas.setFillStyle(this.colourScheme.seaColour);
        canvas.setStrokeStyle(this.colourScheme.seaColour);
        canvas.setLineWidth(0.1);
        canvas.drawPolygon(this.river);

        // Road outline
        canvas.setStrokeStyle(this.colourScheme.minorRoadOutline);
        canvas.setLineWidth(this.colourScheme.outlineSize + this.colourScheme.minorWidth * this.domainController.zoom);
        for (const s of this.minorRoads) canvas.drawPolyline(s);

        canvas.setStrokeStyle(this.colourScheme.majorRoadOutline);
        canvas.setLineWidth(this.colourScheme.outlineSize + this.colourScheme.majorWidth * this.domainController.zoom);
        for (const s of this.majorRoads) canvas.drawPolyline(s);
        canvas.drawPolyline(this.secondaryRiver);

        canvas.setStrokeStyle(this.colourScheme.mainRoadOutline);
        canvas.setLineWidth(this.colourScheme.outlineSize + this.colourScheme.mainWidth * this.domainController.zoom);
        for (const s of this.mainRoads) canvas.drawPolyline(s);
        for (const s of this.coastlineRoads) canvas.drawPolyline(s);

        // Road inline
        canvas.setStrokeStyle(this.colourScheme.minorRoadColour);
        canvas.setLineWidth(this.colourScheme.minorWidth * this.domainController.zoom);
        for (const s of this.minorRoads) canvas.drawPolyline(s);

        canvas.setStrokeStyle(this.colourScheme.majorRoadColour);
        canvas.setLineWidth(this.colourScheme.majorWidth * this.domainController.zoom);
        for (const s of this.majorRoads) canvas.drawPolyline(s);
        canvas.drawPolyline(this.secondaryRiver);

        canvas.setStrokeStyle(this.colourScheme.mainRoadColour);
        canvas.setLineWidth(this.colourScheme.mainWidth * this.domainController.zoom);
        for (const s of this.mainRoads) canvas.drawPolyline(s);
        for (const s of this.coastlineRoads) canvas.drawPolyline(s);

        canvas.setLineWidth(1);
        // Buildings
        if (!this.colourScheme.zoomBuildings || this.domainController.zoom >= 2) {
            canvas.setFillStyle(this.colourScheme.buildingColour);
            canvas.setStrokeStyle(this.colourScheme.buildingStroke);
            for (const b of this.lots) canvas.drawPolygon(b);
        }

        // Pseudo-3D
        if (this.colourScheme.buildingModels && (!this.colourScheme.zoomBuildings || this.domainController.zoom >= 2.5)) {
            canvas.setFillStyle(this.colourScheme.buildingSideColour);
            canvas.setStrokeStyle(this.colourScheme.buildingSideColour);
            for (const b of this.buildingModels) {
                for (const s of b.sides) canvas.drawPolygon(s);
            }
            canvas.setFillStyle(this.colourScheme.buildingColour);
            canvas.setStrokeStyle(this.colourScheme.buildingStroke);
            for (const b of this.buildingModels) canvas.drawPolygon(b.roof);
        }

        if (this.showFrame) {
            canvas.setFillStyle(this.colourScheme.frameColour);
            canvas.setStrokeStyle(this.colourScheme.frameColour);
            canvas.drawFrame(30, 30, 30, 30);

            // canvas.setFillStyle(this.colourScheme.frameTextColour);
            // canvas.drawCityName();
        }
    }
}

export class RoughStyle extends Style {
    private dragging = false;

    constructor(c: HTMLCanvasElement, dragController: DragController) {
        super(dragController);
        this.canvas = this.createCanvasWrapper(c, 1, true);
    }

    public createCanvasWrapper(c: HTMLCanvasElement, scale=1, resizeToWindow=true): CanvasWrapper {
        return new RoughCanvasWrapper(c, scale, resizeToWindow);
    }

    public update() {
        const dragging = this.dragController.isDragging || this.domainController.isScrolling;
        if (!dragging && this.dragging) this.canvas.needsUpdate = true;
        this.dragging = dragging;
    }

    public draw(canvas=this.canvas as RoughCanvasWrapper): void {
        canvas.setOptions({
            roughness: 1,
            bowing: 1,
            stroke: '#000000',
            strokeWidth: 1,
            fill: '#000000',
            fillStyle: 'solid',
        });

        canvas.setOptions({
            fill: "rgb(242,236,222)",
            roughness: 1,
            bowing: 1,
            fillStyle: 'solid',
            stroke: "none",
        });

        canvas.clearCanvas();

        // Sea
        canvas.setOptions({
            roughness: 0,
            fillWeight: 1,
            fill: "#dbd2bd",
            fillStyle: 'solid',
            stroke: "none",
            strokeWidth: 1,
        });

        canvas.drawPolygon(this.seaPolygon);

        canvas.setOptions({
            stroke: "rgb(242,236,222)",
            strokeWidth: 30,
        });
        canvas.drawPolyline(this.coastline);

        canvas.setOptions({
            roughness: 0,
            fillWeight: 1,
            fill: "#dbd2bd",
            fillStyle: 'solid',
            stroke: "none",
            strokeWidth: 1,
        });

        canvas.drawPolygon(this.river);

        // Parks
        canvas.setOptions({
            fill: "rgb(242,236,222)",
        });
        this.parks.forEach(p => canvas.drawPolygon(p));

        // Roads
        canvas.setOptions({
            stroke: '#666666',
            strokeWidth: 1,
            fill: 'none',
        });

        this.minorRoads.forEach(s => canvas.drawPolyline(s));

        canvas.setOptions({
            strokeWidth: 2,
            stroke: '#444444',
        });

        this.majorRoads.forEach(s => canvas.drawPolyline(s));
        canvas.drawPolyline(this.secondaryRiver);

        canvas.setOptions({
            strokeWidth: 3,
            stroke: '#222222',
        });

        this.mainRoads.forEach(s => canvas.drawPolyline(s));
        this.coastlineRoads.forEach(s => canvas.drawPolyline(s));

        // Buildings
        if (!this.dragging) {
            canvas.setOptions({
                roughness: 1.2,
                stroke: '#333333',
                strokeWidth: 1,
                fill: '',
            });

            this.lots.forEach(b => canvas.drawPolygon(b));
        }
    }
}
