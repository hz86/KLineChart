/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import TypeOrNull from '../common/TypeOrNull'

import AxisImp, { Axis, AxisExtremum, AxisTick } from './Axis'

import { calcTextWidth } from '../common/utils/canvas'
import { formatDate } from '../common/utils/format'

export type XAxis = Axis

export default class XAxisImp extends AxisImp {
  protected calcExtremum (): AxisExtremum {
    const chartStore = this.getParent().getChart().getChartStore()
    const { from, to } = chartStore.getTimeScaleStore().getVisibleRange()
    const min = from
    const max = to - 1
    const range = to - from
    return {
      min, max, range, realMin: min, realMax: max, realRange: range
    }
  }

  protected optimalTicks (ticks: AxisTick[]): AxisTick[] {
    const chart = this.getParent().getChart()
    const chartStore = chart.getChartStore()
    const optimalTicks: AxisTick[] = []
    const tickLength = ticks.length
    const dataList = chartStore.getDataList()
    if (tickLength > 0) {
      const dateTimeFormat = chartStore.getTimeScaleStore().getDateTimeFormat()
      const tickTextStyles = chart.getStyleOptions().xAxis.tickText
      const defaultLabelWidth = calcTextWidth('00-00 00:00', tickTextStyles.size, tickTextStyles.weight, tickTextStyles.family)
      const pos = parseInt(ticks[0].value as string, 10)
      const x = this.convertToPixel(pos)
      let tickCountDif = 1
      if (tickLength > 1) {
        const nextPos = parseInt(ticks[1].value as string, 10)
        const nextX = this.convertToPixel(nextPos)
        const xDif = Math.abs(nextX - x)
        if (xDif < defaultLabelWidth) {
          tickCountDif = Math.ceil(defaultLabelWidth / xDif)
        }
      }
      for (let i = 0; i < tickLength; i += tickCountDif) {
        const pos = parseInt(ticks[i].value as string, 10)
        const kLineData = dataList[pos]
        const timestamp = kLineData.timestamp
        let text = formatDate(dateTimeFormat, timestamp, 'hh:mm')
        if (i !== 0) {
          const prevPos = parseInt(ticks[i - tickCountDif].value as string, 10)
          const prevKLineData = dataList[prevPos]
          const prevTimestamp = prevKLineData.timestamp
          text = this._optimalTickLabel(dateTimeFormat, timestamp, prevTimestamp) ?? text
        }
        const x = this.convertToPixel(pos)
        optimalTicks.push({ text, coord: x, value: timestamp })
      }
      const optimalTickLength = optimalTicks.length
      if (optimalTickLength === 1) {
        optimalTicks[0].text = formatDate(dateTimeFormat, optimalTicks[0].value as number, 'YYYY-MM-DD hh:mm')
      } else {
        const firstTimestamp = optimalTicks[0].value as number
        const secondTimestamp = optimalTicks[1].value as number
        if (optimalTicks[2] !== undefined) {
          const thirdText = optimalTicks[2].text
          if (/^[0-9]{2}-[0-9]{2}$/.test(thirdText)) {
            optimalTicks[0].text = formatDate(dateTimeFormat, firstTimestamp, 'MM-DD')
          } else if (/^[0-9]{4}-[0-9]{2}$/.test(thirdText)) {
            optimalTicks[0].text = formatDate(dateTimeFormat, firstTimestamp, 'YYYY-MM')
          } else if (/^[0-9]{4}$/.test(thirdText)) {
            optimalTicks[0].text = formatDate(dateTimeFormat, firstTimestamp, 'YYYY')
          }
        } else {
          optimalTicks[0].text = this._optimalTickLabel(dateTimeFormat, firstTimestamp, secondTimestamp) ?? optimalTicks[0].text
        }
      }
    }
    return optimalTicks
  }

  private _optimalTickLabel (dateTimeFormat: Intl.DateTimeFormat, timestamp: number, comparedTimestamp: number): TypeOrNull<string> {
    const year = formatDate(dateTimeFormat, timestamp, 'YYYY')
    const month = formatDate(dateTimeFormat, timestamp, 'YYYY-MM')
    const day = formatDate(dateTimeFormat, timestamp, 'MM-DD')
    if (year !== formatDate(dateTimeFormat, comparedTimestamp, 'YYYY')) {
      return year
    } else if (month !== formatDate(dateTimeFormat, comparedTimestamp, 'YYYY-MM')) {
      return month
    } else if (day !== formatDate(dateTimeFormat, comparedTimestamp, 'MM-DD')) {
      return day
    }
    return null
  }

  getAutoSize (): number {
    const styles = this.getParent().getChart().getStyleOptions()
    const xAxisStyles = styles.xAxis
    const height = xAxisStyles.size
    if (height !== 'auto') {
      return height
    }
    const crosshairStyles = styles.crosshair
    let xAxisHeight = 0
    if (xAxisStyles.show) {
      if (xAxisStyles.axisLine.show) {
        xAxisHeight += xAxisStyles.axisLine.size
      }
      if (xAxisStyles.tickLine.show) {
        xAxisHeight += xAxisStyles.tickLine.length
      }
      if (xAxisStyles.tickText.show) {
        xAxisHeight += (xAxisStyles.tickText.marginStart + xAxisStyles.tickText.marginEnd + xAxisStyles.tickText.size)
      }
    }
    let crosshairVerticalTextHeight = 0
    if (
      crosshairStyles.show &&
      crosshairStyles.vertical.show &&
      crosshairStyles.vertical.text.show
    ) {
      crosshairVerticalTextHeight += (
        crosshairStyles.vertical.text.paddingTop +
        crosshairStyles.vertical.text.paddingBottom +
        crosshairStyles.vertical.text.borderSize * 2 +
        crosshairStyles.vertical.text.size
      )
    }
    return Math.max(xAxisHeight, crosshairVerticalTextHeight)
  }

  convertFromPixel (pixel: number): number {
    return this.getParent().getChart().getChartStore().getTimeScaleStore().coordinateToDataIndex(pixel)
  }

  convertToPixel (value: number): number {
    return this.getParent().getChart().getChartStore().getTimeScaleStore().dataIndexToCoordinate(value)
  }
}
