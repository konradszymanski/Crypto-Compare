import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, DataZoomComponent, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

export { echarts };
