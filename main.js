// Simple 2-level regression tree for 1D feature
function fitTwoLevelTree(data) {
    // Sort data by x
    const sorted = [...data].sort((a, b) => a.x - b.x);
    // Try all possible first splits (between points)
    let bestSplit = null;
    let bestMSE = Infinity;
    let bestPreds = null;
    for (let i = 1; i < sorted.length; i++) {
        // Split at i: left = 0..i-1, right = i..n-1
        const left = sorted.slice(0, i);
        const right = sorted.slice(i);
        const leftMean = left.reduce((s, p) => s + p.y, 0) / left.length;
        const rightMean = right.reduce((s, p) => s + p.y, 0) / right.length;
        // For each region, try a second split
        for (let j = 1; j < left.length; j++) {
            const l1 = left.slice(0, j);
            const l2 = left.slice(j);
            const l1Mean = l1.reduce((s, p) => s + p.y, 0) / l1.length;
            const l2Mean = l2.reduce((s, p) => s + p.y, 0) / l2.length;
            // Assign predictions
            const preds = [];
            for (let k = 0; k < sorted.length; k++) {
                if (k < j) preds.push(l1Mean);
                else if (k < i) preds.push(l2Mean);
                else preds.push(rightMean);
            }
            // Compute MSE
            const mse = sorted.reduce((s, p, idx) => s + (p.y - preds[idx]) ** 2, 0) / sorted.length;
            if (mse < bestMSE) {
                bestMSE = mse;
                bestSplit = {i, j};
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
                bestSplit = {i, j: i + j};
                bestPreds = preds.slice();
    }
}

function plotResiduals(canvas, data, meanY, selectedIdx = null) {
}
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Margins and plot area
    const pad = 60;
    const plotW = canvas.width - 2 * pad;
    const plotH = canvas.height - 2 * pad;
    // Residuals: y - meanY
    const residuals = data.map(p => p.y - meanY);
    const xs = data.map(p => p.x);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minR = Math.min(...residuals), maxR = Math.max(...residuals);
    // Draw axes
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // x axis
    ctx.moveTo(pad, canvas.height - pad);
    ctx.lineTo(canvas.width - pad, canvas.height - pad);
    // y axis
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, canvas.height - pad);
    ctx.stroke();

}
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
    // x axis label
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('x', pad + plotW / 2, canvas.height - pad + 36);

    // Draw tick marks and labels for y axis (residuals)
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
    // y axis label
    ctx.save();
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.translate(pad - 38, pad + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('residual', 0, 0);
    ctx.restore();

    // Fit 2-level regression tree and plot step function on green points
    const tree = fitTwoLevelTree(data);
    if (tree) {
        ctx.save();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < tree.xs.length; i++) {
            const px = pad + ((tree.xs[i] - minX) / (maxX - minX)) * plotW;
            // For y, use the step function value (prediction) as a residual
            const py = canvas.height - pad - ((tree.preds[i] - meanY - minR) / (maxR - minR)) * plotH;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
            if (i < tree.xs.length - 1) {
                const nextPx = pad + ((tree.xs[i + 1] - minX) / (maxX - minX)) * plotW;
                ctx.lineTo(nextPx, py);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    for (let i = 0; i < data.length; i++) {
        const px = pad + ((xs[i] - minX) / (maxX - minX)) * plotW;
        const py = canvas.height - pad - ((residuals[i] - minR) / (maxR - minR)) * plotH;
        // If selected, highlight; if not selected and something is selected, grey out
        if (selectedIdx === null || selectedIdx === i) {
            ctx.fillStyle = '#2ECC40';
        } else {
            ctx.fillStyle = '#bbb';
        }
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fill();

        // If selected, draw line to y-axis and label residual and coordinates
        if (selectedIdx === i) {
            ctx.save();
            ctx.strokeStyle = '#FF851B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(pad, py);
            ctx.stroke();
            ctx.restore();
            // Draw residual label
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#FF851B';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            const res = residuals[i].toFixed(2);
            ctx.fillText(`residual: ${res}`, pad + 10, py - 8);
            // Draw coordinates label for green point
            ctx.font = '14px Arial';
            ctx.fillStyle = '#2ECC40';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`(${data[i].x.toFixed(2)}, ${res})`, px, py + 12);
        }
    }

window.onload = function() {
    const canvas = document.getElementById('plot');
    const resCanvas = document.getElementById('residuals');
    const data = generateData(10);
    // Compute mean y for residuals
    const meanY = data.reduce((sum, p) => sum + p.y, 0) / data.length;
    plotData(canvas, data, meanY);
    plotResiduals(resCanvas, data, meanY, selectedIdx);

    // Add click event for interactivity
    canvas.addEventListener('click', function(evt) {
        const rect = canvas.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;
        // Recompute bounds for hit detection
        // ...existing code...
        let found = null;
        for (let i = 0; i < data.length; i++) {
            const px = pad + ((data[i].x - minX) / (maxX - minX)) * plotW;
            const py = canvas.height - pad - ((data[i].y - minY) / (maxY - minY)) * plotH;
            const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            if (dist < 10) {
                found = i;
                break;
            }
        }
        if (found !== null) {
            selectedIdx = found;
        } else {
            selectedIdx = null;
        }
        plotData(canvas, data, meanY);
        plotResiduals(resCanvas, data, meanY, selectedIdx);
    });
};
