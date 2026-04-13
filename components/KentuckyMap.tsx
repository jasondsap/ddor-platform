'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

interface CountyData {
    county_name: string;
    client_count: number;
    facility_count?: number;
}

interface KentuckyMapProps {
    data: CountyData[];
    title?: string;
    colorScheme?: 'blue' | 'green' | 'red';
    valueLabel?: string;
}

// Kentucky county FIPS lookup (county name → FIPS code suffix)
const KY_FIPS: Record<string, string> = {
    'Adair': '001', 'Allen': '003', 'Anderson': '005', 'Ballard': '007', 'Barren': '009',
    'Bath': '011', 'Bell': '013', 'Boone': '015', 'Bourbon': '017', 'Boyd': '019',
    'Boyle': '021', 'Bracken': '023', 'Breathitt': '025', 'Breckinridge': '027', 'Bullitt': '029',
    'Butler': '031', 'Caldwell': '033', 'Calloway': '035', 'Campbell': '037', 'Carlisle': '039',
    'Carroll': '041', 'Carter': '043', 'Casey': '045', 'Christian': '047', 'Clark': '049',
    'Clay': '051', 'Clinton': '053', 'Crittenden': '055', 'Cumberland': '057', 'Daviess': '059',
    'Edmonson': '061', 'Elliott': '063', 'Estill': '065', 'Fayette': '067', 'Fleming': '069',
    'Floyd': '071', 'Franklin': '073', 'Fulton': '075', 'Gallatin': '077', 'Garrard': '079',
    'Grant': '081', 'Graves': '083', 'Grayson': '085', 'Green': '087', 'Greenup': '089',
    'Hancock': '091', 'Hardin': '093', 'Harlan': '095', 'Harrison': '097', 'Hart': '099',
    'Henderson': '101', 'Henry': '103', 'Hickman': '105', 'Hopkins': '107', 'Jackson': '109',
    'Jefferson': '111', 'Jessamine': '113', 'Johnson': '115', 'Kenton': '117', 'Knott': '119',
    'Knox': '121', 'Larue': '123', 'Laurel': '125', 'Lawrence': '127', 'Lee': '129',
    'Leslie': '131', 'Letcher': '133', 'Lewis': '135', 'Lincoln': '137', 'Livingston': '139',
    'Logan': '141', 'Lyon': '143', 'Madison': '145', 'Magoffin': '147', 'Marion': '149',
    'Marshall': '151', 'Martin': '153', 'Mason': '155', 'McCracken': '157', 'McCreary': '159',
    'McLean': '161', 'Meade': '163', 'Menifee': '165', 'Mercer': '167', 'Metcalfe': '169',
    'Monroe': '171', 'Montgomery': '173', 'Morgan': '175', 'Muhlenberg': '177', 'Nelson': '179',
    'Nicholas': '181', 'Ohio': '183', 'Oldham': '185', 'Owen': '187', 'Owsley': '189',
    'Pendleton': '191', 'Perry': '193', 'Pike': '195', 'Powell': '197', 'Pulaski': '199',
    'Robertson': '201', 'Rockcastle': '203', 'Rowan': '205', 'Russell': '207', 'Scott': '209',
    'Shelby': '211', 'Simpson': '213', 'Spencer': '215', 'Taylor': '217', 'Todd': '219',
    'Trigg': '221', 'Trimble': '223', 'Union': '225', 'Warren': '227', 'Washington': '229',
    'Wayne': '231', 'Webster': '233', 'Whitley': '235', 'Wolfe': '237', 'Woodford': '239',
};

export default function KentuckyMap({ data, title = 'Kentucky Program Coverage', colorScheme = 'blue', valueLabel = 'Participants' }: KentuckyMapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);

    // Build lookup: county name → data
    const dataMap = new Map<string, CountyData>();
    for (const d of data) {
        dataMap.set(d.county_name.toLowerCase(), d);
    }

    const maxValue = Math.max(1, ...data.map(d => d.client_count));

    const colorScales = {
        blue: d3.scaleSequential(d3.interpolateBlues).domain([0, maxValue]),
        green: d3.scaleSequential(d3.interpolateGreens).domain([0, maxValue]),
        red: d3.scaleSequential(d3.interpolateOrRd).domain([0, maxValue]),
    };
    const colorScale = colorScales[colorScheme];

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const width = 700;
        const height = 340;

        svg.attr('viewBox', `0 0 ${width} ${height}`);

        // Fetch Kentucky county TopoJSON
        const url = 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';

        d3.json(url).then((us: any) => {
            if (!us) return;

            // Filter to Kentucky counties (FIPS state code 21)
            const counties = topojson.feature(us, us.objects.counties) as any;
            const kyCounties = {
                type: 'FeatureCollection',
                features: counties.features.filter((f: any) => String(f.id).startsWith('21')),
            };

            // State boundary
            const states = topojson.feature(us, us.objects.states) as any;
            const kyState = {
                type: 'FeatureCollection',
                features: states.features.filter((f: any) => String(f.id) === '21'),
            };

            // Projection fitted to Kentucky
            const projection = d3.geoAlbers()
                .rotate([85.7, 0])
                .center([0, 37.8])
                .fitSize([width - 40, height - 40], kyState as any)
                .translate([width / 2, height / 2]);

            const path = d3.geoPath().projection(projection);

            // Build FIPS → county name reverse lookup
            const fipsToName: Record<string, string> = {};
            for (const [name, fips] of Object.entries(KY_FIPS)) {
                fipsToName['21' + fips] = name;
            }

            // Clear previous render
            svg.selectAll('*').remove();

            // Draw counties
            svg.append('g')
                .selectAll('path')
                .data(kyCounties.features)
                .join('path')
                .attr('d', path as any)
                .attr('fill', (d: any) => {
                    const countyName = fipsToName[String(d.id)];
                    const countyData = countyName ? dataMap.get(countyName.toLowerCase()) : null;
                    if (countyData && countyData.client_count > 0) {
                        return colorScale(countyData.client_count) as string;
                    }
                    return '#f1f5f9'; // Light gray for no data
                })
                .attr('stroke', '#94a3b8')
                .attr('stroke-width', 0.5)
                .attr('cursor', 'pointer')
                .on('mouseover', function (event: any, d: any) {
                    d3.select(this).attr('stroke', '#1A2B4A').attr('stroke-width', 2);

                    const countyName = fipsToName[String(d.id)] || 'Unknown';
                    const countyData = dataMap.get(countyName.toLowerCase());
                    const tooltip = tooltipRef.current;
                    if (tooltip) {
                        tooltip.style.display = 'block';
                        tooltip.style.left = `${event.offsetX + 12}px`;
                        tooltip.style.top = `${event.offsetY - 10}px`;
                        tooltip.innerHTML = `
                            <div style="font-weight:600;font-size:13px;margin-bottom:2px;">${countyName} County</div>
                            <div style="font-size:12px;color:#6b7280;">${valueLabel}: <strong style="color:#1A73A8;">${countyData?.client_count || 0}</strong></div>
                            ${countyData?.facility_count ? `<div style="font-size:12px;color:#6b7280;">Facilities: <strong>${countyData.facility_count}</strong></div>` : ''}
                        `;
                    }
                })
                .on('mousemove', function (event: any) {
                    const tooltip = tooltipRef.current;
                    if (tooltip) {
                        tooltip.style.left = `${event.offsetX + 12}px`;
                        tooltip.style.top = `${event.offsetY - 10}px`;
                    }
                })
                .on('mouseout', function () {
                    d3.select(this).attr('stroke', '#94a3b8').attr('stroke-width', 0.5);
                    const tooltip = tooltipRef.current;
                    if (tooltip) tooltip.style.display = 'none';
                });

            // State border outline
            svg.append('path')
                .datum(kyState)
                .attr('d', path as any)
                .attr('fill', 'none')
                .attr('stroke', '#1A2B4A')
                .attr('stroke-width', 1.5);

            setLoaded(true);
        }).catch(err => {
            console.error('Failed to load map data:', err);
        });
    }, [data, colorScheme]);

    // Legend
    const legendSteps = 5;
    const legendColors = Array.from({ length: legendSteps }, (_, i) => ({
        value: Math.round((maxValue / legendSteps) * (i + 1)),
        color: colorScale((maxValue / legendSteps) * (i + 1)) as string,
    }));

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-ddor-navy text-lg mb-1">{title}</h2>
            <p className="text-xs text-gray-500 mb-4">Hover over a county to see details</p>

            <div className="relative" style={{ maxWidth: 700 }}>
                <svg ref={svgRef} className="w-full h-auto" />
                <div
                    ref={tooltipRef}
                    style={{
                        display: 'none',
                        position: 'absolute',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '8px 12px',
                        pointerEvents: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 50,
                        minWidth: 140,
                    }}
                />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 justify-center">
                <span className="text-xs text-gray-400">0</span>
                <div className="flex h-3 rounded-full overflow-hidden" style={{ width: 200 }}>
                    <div style={{ flex: 1, background: '#f1f5f9' }} />
                    {legendColors.map((l, i) => (
                        <div key={i} style={{ flex: 1, background: l.color }} />
                    ))}
                </div>
                <span className="text-xs text-gray-400">{maxValue}+</span>
                <span className="text-xs text-gray-500 ml-2">{valueLabel}</span>
            </div>

            {/* Stats summary */}
            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-500">
                <span><strong className="text-ddor-navy">{data.filter(d => d.client_count > 0).length}</strong> counties with participants</span>
                <span><strong className="text-ddor-navy">{data.reduce((s, d) => s + d.client_count, 0)}</strong> total {valueLabel.toLowerCase()}</span>
            </div>
        </div>
    );
}
