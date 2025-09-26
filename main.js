// Generate 10 points from a noisy parabola: y = x^2 + noise
function generateData(n = 10) {
    const data = [];
    for (let i = 0; i < n; i++) {
        const x = -2 + 4 * (i / (n - 1));
        const noise = (Math.random() - 0.5) * 1.5;
        const y = x * x + noise;
        data.push({ x, y });
    }
    return data;
}

// Simple 2-level regression tree for 1D feature
function fitTwoLevelTree(data) {
    // Attach original indices so we can map predictions back to original order
    const withIdx = data.map((p, i) => ({ x: p.x, y: p.y, _i: i }));
    const sorted = withIdx.sort((a, b) => a.x - b.x);
    let bestMSE = Infinity;
    let bestPreds = null;
    for (let i = 1; i < sorted.length; i++) {
        const left = sorted.slice(0, i);
        const right = sorted.slice(i);
        const leftMean = left.reduce((s, p) => s + p.y, 0) / left.length;
        const rightMean = right.reduce((s, p) => s + p.y, 0) / right.length;
        for (let j = 1; j < left.length; j++) {
            const l1 = left.slice(0, j);
            const l2 = left.slice(j);
            const l1Mean = l1.reduce((s, p) => s + p.y, 0) / l1.length;
            const l2Mean = l2.reduce((s, p) => s + p.y, 0) / l2.length;
            const preds = [];
            for (let k = 0; k < sorted.length; k++) {
                if (k < j) preds.push(l1Mean);
                else if (k < i) preds.push(l2Mean);
                else preds.push(rightMean);
            }
            const mse = sorted.reduce((s, p, idx) => s + (p.y - preds[idx]) ** 2, 0) / sorted.length;
            if (mse < bestMSE) {
                bestMSE = mse;
                bestPreds = preds.slice();
            }
        }
        for (let j = 1; j < right.length; j++) {
            const r1 = right.slice(0, j);
            const r2 = right.slice(j);
            const r1Mean = r1.reduce((s, p) => s + p.y, 0) / r1.length;
            const r2Mean = r2.reduce((s, p) => s + p.y, 0) / r2.length;
            const preds = [];
            for (let k = 0; k < sorted.length; k++) {
                if (k < i) preds.push(leftMean);
                else if (k < i + j) preds.push(r1Mean);
                else preds.push(r2Mean);
            }
            const mse = sorted.reduce((s, p, idx) => s + (p.y - preds[idx]) ** 2, 0) / sorted.length;
            if (mse < bestMSE) {
                bestMSE = mse;
                bestPreds = preds.slice();
            }
        }
    }
    return { xs: sorted.map(p => p.x), preds: bestPreds, idxs: sorted.map(p => p._i) };
}

let selectedIdx = null;

function plotData(canvas, data, meanY) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const xs = data.map(p => p.x);
    const ys = data.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 60;
    const plotW = canvas.width - 2 * pad;
    const plotH = canvas.height - 2 * pad;

    // axes
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, canvas.height - pad);
    ctx.lineTo(canvas.width - pad, canvas.height - pad);
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, canvas.height - pad);
    ctx.stroke();

    // x ticks
    ctx.font = '14px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
        const xVal = minX + (i / xTicks) * (maxX - minX);
        const px = pad + ((xVal - minX) / (maxX - minX)) * plotW;
        ctx.beginPath();
        ctx.moveTo(px, canvas.height - pad);
        ctx.lineTo(px, canvas.height - pad + 8);
        ctx.stroke();
        ctx.fillText(xVal.toFixed(2), px, canvas.height - pad + 10);
    }
    ctx.font = '16px Arial';
    ctx.fillText('x', pad + plotW / 2, canvas.height - pad + 36);

    // y ticks
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const yVal = minY + (i / yTicks) * (maxY - minY);
        const py = canvas.height - pad - ((yVal - minY) / (maxY - minY)) * plotH;
        ctx.beginPath();
        ctx.moveTo(pad - 8, py);
        ctx.lineTo(pad, py);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(2), pad - 12, py);
    }
    ctx.save();
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.translate(pad - 38, pad + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('y', 0, 0);
    ctx.restore();

    // mean line
    const avgY = meanY;
    const avgPy = canvas.height - pad - ((avgY - minY) / (maxY - minY)) * plotH;
    ctx.save();
    ctx.strokeStyle = '#FF4136';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(pad, avgPy);
    ctx.lineTo(canvas.width - pad, avgPy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.font = '14px Arial';
    ctx.fillStyle = '#FF4136';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('mean(y)', canvas.width - pad + 8, avgPy - 2);

    // points
    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        const px = pad + ((p.x - minX) / (maxX - minX)) * plotW;
        const py = canvas.height - pad - ((p.y - minY) / (maxY - minY)) * plotH;
        ctx.fillStyle = (selectedIdx === null || selectedIdx === i) ? '#0074D9' : '#bbb';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fill();
        if (selectedIdx === i) {
            ctx.save();
            ctx.strokeStyle = '#FF851B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, avgPy);
            ctx.stroke();
            ctx.restore();
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#FF851B';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const res = (p.y - avgY).toFixed(2);
            ctx.fillText(`residual: ${res}`, px + 10, py + (avgPy - py) / 2);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#0074D9';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`, px, py - 12);
        }
    }
}

function plotResiduals(canvas, data, meanY, residualTree, selected = null, yhat = null) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pad = 60;
    const plotW = canvas.width - 2 * pad;
    const plotH = canvas.height - 2 * pad;
    const residuals = yhat ? data.map((p, i) => p.y - yhat[i]) : data.map(p => p.y - meanY);
    const xs = data.map(p => p.x);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    let minR = Math.min(...residuals), maxR = Math.max(...residuals);
    if (residualTree && residualTree.preds) {
        minR = Math.min(minR, ...residualTree.preds);
        maxR = Math.max(maxR, ...residualTree.preds);
    }

    // axes
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad, canvas.height - pad);
    ctx.lineTo(canvas.width - pad, canvas.height - pad);
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, canvas.height - pad);
    ctx.stroke();

    // x ticks
    ctx.font = '14px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
        const xVal = minX + (i / xTicks) * (maxX - minX);
        const px = pad + ((xVal - minX) / (maxX - minX)) * plotW;
        ctx.beginPath();
        ctx.moveTo(px, canvas.height - pad);
        ctx.lineTo(px, canvas.height - pad + 8);
        ctx.stroke();
        ctx.fillText(xVal.toFixed(2), px, canvas.height - pad + 10);
    }
    ctx.font = '16px Arial';
    ctx.fillText('x', pad + plotW / 2, canvas.height - pad + 36);

    // y ticks (residuals)
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const rVal = minR + (i / yTicks) * (maxR - minR);
        const py = canvas.height - pad - ((rVal - minR) / (maxR - minR)) * plotH;
        ctx.beginPath();
        ctx.moveTo(pad - 8, py);
        ctx.lineTo(pad, py);
        ctx.stroke();
        ctx.fillText(rVal.toFixed(2), pad - 12, py);
    }
    ctx.save();
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.translate(pad - 38, pad + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('residual', 0, 0);
    ctx.restore();
    // minimal annotations only

    // residual step function
    if (residualTree && residualTree.xs && residualTree.preds) {
        ctx.save();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < residualTree.xs.length; i++) {
            const px = pad + ((residualTree.xs[i] - minX) / (maxX - minX)) * plotW;
            const py = canvas.height - pad - ((residualTree.preds[i] - minR) / (maxR - minR)) * plotH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
            if (i < residualTree.xs.length - 1) {
                const nextPx = pad + ((residualTree.xs[i + 1] - minX) / (maxX - minX)) * plotW;
                ctx.lineTo(nextPx, py);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    // residual points
    for (let i = 0; i < data.length; i++) {
        const px = pad + ((xs[i] - minX) / (maxX - minX)) * plotW;
        const py = canvas.height - pad - ((residuals[i] - minR) / (maxR - minR)) * plotH;
        ctx.fillStyle = (selected === null || selected === i) ? '#2ECC40' : '#bbb';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fill();
        if (selected === i) {
            ctx.save();
            ctx.strokeStyle = '#FF851B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(pad, py);
            ctx.stroke();
            ctx.restore();
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#FF851B';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            const res = residuals[i].toFixed(2);
            ctx.fillText(`residual: ${res}`, pad + 10, py - 8);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#2ECC40';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`(${data[i].x.toFixed(2)}, ${res})`, px, py + 12);
        }
    }
}

// Sum plot: original data and mean + residual tree approximation
function plotSumApprox(canvas, data, meanY, residualTree) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const xs = data.map(p => p.x);
    const ys = data.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 60; const plotW = canvas.width - 2 * pad; const plotH = canvas.height - 2 * pad;

    // axes
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(pad, canvas.height - pad); ctx.lineTo(canvas.width - pad, canvas.height - pad);
    ctx.moveTo(pad, pad); ctx.lineTo(pad, canvas.height - pad); ctx.stroke();

    // x ticks
    ctx.font = '14px Arial'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
        const xVal = minX + (i / xTicks) * (maxX - minX);
        const px = pad + ((xVal - minX) / (maxX - minX)) * plotW;
        ctx.beginPath(); ctx.moveTo(px, canvas.height - pad); ctx.lineTo(px, canvas.height - pad + 8); ctx.stroke();
        ctx.fillText(xVal.toFixed(2), px, canvas.height - pad + 10);
    }
    ctx.font = '16px Arial'; ctx.fillText('x', pad + plotW / 2, canvas.height - pad + 36);

    // y ticks
    ctx.font = '14px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const yVal = minY + (i / yTicks) * (maxY - minY);
        const py = canvas.height - pad - ((yVal - minY) / (maxY - minY)) * plotH;
        ctx.beginPath(); ctx.moveTo(pad - 8, py); ctx.lineTo(pad, py); ctx.stroke();
        ctx.fillText(yVal.toFixed(2), pad - 12, py);
    }
    ctx.save(); ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.translate(pad - 38, pad + plotH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('y', 0, 0); ctx.restore();

    // original points
    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        const px = pad + ((p.x - minX) / (maxX - minX)) * plotW;
        const py = canvas.height - pad - ((p.y - minY) / (maxY - minY)) * plotH;
        ctx.fillStyle = '#0074D9';
        ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fill();
    }

    // mean + residual tree step
    if (residualTree && residualTree.xs && residualTree.preds) {
        ctx.save(); ctx.strokeStyle = '#B10DC9'; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i < residualTree.xs.length; i++) {
            const px = pad + ((residualTree.xs[i] - minX) / (maxX - minX)) * plotW;
            const yhat = meanY + residualTree.preds[i];
            const py = canvas.height - pad - ((yhat - minY) / (maxY - minY)) * plotH;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            if (i < residualTree.xs.length - 1) {
                const nextPx = pad + ((residualTree.xs[i + 1] - minX) / (maxX - minX)) * plotW;
                ctx.lineTo(nextPx, py);
            }
        }
        ctx.stroke(); ctx.restore();
    }

        // no in-canvas legend; external captions handle labeling
}

window.onload = function() {
    const canvas = document.getElementById('plot');
    const resCanvas1 = document.getElementById('residuals1');
    const resCanvas2 = document.getElementById('residuals2');
    const resCanvas3 = document.getElementById('residuals3');
    const resCanvas4 = document.getElementById('residuals4');
    const sumCanvas1 = document.getElementById('sumplot1');
    const sumCanvas2 = document.getElementById('sumplot2');
    const sumCanvas3 = document.getElementById('sumplot3');
    const sumCanvas4 = document.getElementById('sumplot4');

    const data = generateData(10);
    const meanY = data.reduce((sum, p) => sum + p.y, 0) / data.length;

    // First residuals and tree (tree1)
    const residualData1 = data.map(p => ({ x: p.x, y: p.y - meanY }));
    const tree1 = fitTwoLevelTree(residualData1);

    // First approximation yhat1 = mean + tree1 (mapped back to original order)
    const yhat1 = Array(data.length).fill(meanY);
    if (tree1 && tree1.preds && tree1.idxs) {
        for (let k = 0; k < tree1.preds.length; k++) {
            const origIdx = tree1.idxs[k];
            yhat1[origIdx] += tree1.preds[k];
        }
    }

    // Second residuals to the first approximation and tree (tree2)
    const residualData2 = data.map((p, i) => ({ x: p.x, y: p.y - yhat1[i] }));
    const tree2 = fitTwoLevelTree(residualData2);

    // Final approximation: mean + tree1 + tree2
    const yhat2 = yhat1.slice();
    if (tree2 && tree2.preds && tree2.idxs) {
        for (let k = 0; k < tree2.preds.length; k++) {
            const origIdx = tree2.idxs[k];
            yhat2[origIdx] += tree2.preds[k];
        }
    }

    // Third residuals to yhat2 and tree (tree3)
    const residualData3 = data.map((p, i) => ({ x: p.x, y: p.y - yhat2[i] }));
    const tree3 = fitTwoLevelTree(residualData3);
    const yhat3 = yhat2.slice();
    if (tree3 && tree3.preds && tree3.idxs) {
        for (let k = 0; k < tree3.preds.length; k++) {
            const origIdx = tree3.idxs[k];
            yhat3[origIdx] += tree3.preds[k];
        }
    }

    // Fourth residuals to yhat3 and tree (tree4)
    const residualData4 = data.map((p, i) => ({ x: p.x, y: p.y - yhat3[i] }));
    const tree4 = fitTwoLevelTree(residualData4);
    const yhat4 = yhat3.slice();
    if (tree4 && tree4.preds && tree4.idxs) {
        for (let k = 0; k < tree4.preds.length; k++) {
            const origIdx = tree4.idxs[k];
            yhat4[origIdx] += tree4.preds[k];
        }
    }

    // Helper: combine step functions (assumes same xs order)
    function combineSteps(trees) {
        const valid = trees.filter(t => t && t.xs && t.preds);
        if (valid.length === 0) return null;
        const baseXs = valid[0].xs.slice();
        const preds = new Array(baseXs.length).fill(0);
        for (const t of valid) {
            const len = Math.min(preds.length, t.preds.length);
            for (let i = 0; i < len; i++) preds[i] += t.preds[i];
        }
        return { xs: baseXs, preds };
    }

    plotData(canvas, data, meanY);
    // Right column top: residuals to mean with tree1 step
    plotResiduals(resCanvas1, data, meanY, tree1, selectedIdx, null);
    // Right column next: residuals to yhat1 with tree2 step
    plotResiduals(resCanvas2, data, meanY, tree2, selectedIdx, yhat1);
    // Additional right plots: residuals to yhat2 and yhat3
    if (resCanvas3) plotResiduals(resCanvas3, data, meanY, tree3, selectedIdx, yhat2);
    if (resCanvas4) plotResiduals(resCanvas4, data, meanY, tree4, selectedIdx, yhat3);

    // Left column middle: mean + tree1
    plotSumApprox(sumCanvas1, data, meanY, tree1);
    // Left column next: mean + tree1 + tree2
    const comb12 = combineSteps([tree1, tree2]);
    plotSumApprox(sumCanvas2, data, meanY, comb12);
    // Additional left plots: mean + tree1 + tree2 + tree3, and + tree4
    if (sumCanvas3) {
        const comb123 = combineSteps([tree1, tree2, tree3]);
        plotSumApprox(sumCanvas3, data, meanY, comb123);
    }
    if (sumCanvas4) {
        const comb1234 = combineSteps([tree1, tree2, tree3, tree4]);
        plotSumApprox(sumCanvas4, data, meanY, comb1234);
    }

    // interaction
    canvas.addEventListener('click', function(evt) {
        const rect = canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;
        const xs = data.map(p => p.x);
        const ys = data.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const pad = 60; const plotW = canvas.width - 2 * pad; const plotH = canvas.height - 2 * pad;
        let found = null;
        for (let i = 0; i < data.length; i++) {
            const px = pad + ((data[i].x - minX) / (maxX - minX)) * plotW;
            const py = canvas.height - pad - ((data[i].y - minY) / (maxY - minY)) * plotH;
            const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            if (dist < 10) { found = i; break; }
        }
        selectedIdx = (found !== null) ? found : null;
        // recompute yhat arrays on click (data unchanged but selectedIdx changes)
        const yhat1_click = yhat1;
        const yhat2_click = yhat2;
        plotData(canvas, data, meanY);
        plotResiduals(resCanvas1, data, meanY, tree1, selectedIdx, null);
        plotResiduals(resCanvas2, data, meanY, tree2, selectedIdx, yhat1_click);
        if (resCanvas3) plotResiduals(resCanvas3, data, meanY, tree3, selectedIdx, yhat2);
        if (resCanvas4) plotResiduals(resCanvas4, data, meanY, tree4, selectedIdx, yhat3);
        plotSumApprox(sumCanvas1, data, meanY, tree1);
        plotSumApprox(sumCanvas2, data, meanY, comb12);
        if (sumCanvas3) { const comb123 = combineSteps([tree1, tree2, tree3]); plotSumApprox(sumCanvas3, data, meanY, comb123); }
        if (sumCanvas4) { const comb1234 = combineSteps([tree1, tree2, tree3, tree4]); plotSumApprox(sumCanvas4, data, meanY, comb1234); }
    });
}
