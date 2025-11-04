1477
          }
1478
​
1479
 
const overflowDetail = computeOverflowDetail({
1480
 rawMagnitude: safeRawMag,
1481
 clampedMagnitude: typeof safeRawMag === 'number' ? clamp(safeRawMag, 0, 5) : null,
1482
 rawDirectionalBias: safeRawBias,
1483
 clampedDirectionalBias:
1484
 typeof safeRawBias === 'number' ? clamp(safeRawBias, -5, 5) : null,
1485
 aspects: (dayData as any).aspects,
1486
          });
1487
​
1488
 dailyReadings.push({
1489
 date,
1490
 magnitude:
1491
 typeof safeRawMag === 'number' ? normalizeToFrontStage(safeRawMag, 'magnitude') : null,
1492
 directional_bias:
1493
 typeof safeRawBias === 'number'
1494
 ? normalizeToFrontStage(safeRawBias, 'directional_bias')
1495
                : null,
1496
 volatility:
1497
 typeof safeRawVol === 'number' ? normalizeToFrontStage(safeRawVol, 'volatility') : null,
1498
 coherence,
1499
 raw_magnitude: safeRawMag ?? null,
1500
 raw_bias_signed: safeRawBias ?? null,
1501
 raw_volatility: safeRawVol ?? null,
1502
 label: (dayData as any).label || null,
1503
 notes: (dayData as any).notes || null,
1504
 aspects: (dayData as any).aspects || [],
1505
 aspect_count: (dayData as any).aspects?.length || 0,
1506
 overflow_detail: overflowDetail,
1507
          });
1508
        });
1509
​
1510
 weatherData.daily_readings = dailyReadings;
1511
 weatherData.reading_count = dailyReadings.length;
1512
    }
1513
​
1514
 if (unifiedOutput?.woven_map?.symbolic_weather) {
1515
 weatherData.symbolic_weather_context = unifiedOutput.woven_map.symbolic_weather;
1516
    }
1517
​
1518
 // Generate filename using directive suffix with Mirror+SymbolicWeather format
1519
 const directiveSuffix = getDirectiveSuffix();
1520
 const symbolicFilename = directiveSuffix
1521
 ? `Mirror+SymbolicWeather_${directiveSuffix}.json`
1522
      : 'Mirror+SymbolicWeather.json';
1523

1524
 return {
1525
 filename: symbolicFilename,
1526
 payload: weatherData,
1527
 hasChartGeometry,
1528
    };
1529
  }, [getDirectiveSuffix, reportContractType, result]);
1530
​
1531
 interface MirrorDirectiveExport {
1532
 filename: string;
1533
 payload: any;
1534
  }
1535
​
1536
 interface FieldMapMeta {
1537
 schema: string;