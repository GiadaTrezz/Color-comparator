document.addEventListener("DOMContentLoaded", function (){
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    const fileInput = document.getElementById("fileInput");
    const colorList = document.getElementById("colorList");
    const results = document.getElementById("results");
    const rightPanel = document.querySelector(".right-panel");
    const instruction = document.createElement("p");
    let selectedColors = [];
    let img = new Image();
    let imageLoaded = false;
    let instructionsAdded = false;

    instruction.textContent = "Cliquez sur le centre des carrés colorés : d'abord le résultat du test, puis les références en ordre croissant.";
    instruction.style.fontSize = "16px";
    instruction.style.fontWeight = "bold";
    instruction.style.textAlign = "center";
    instruction.style.marginTop = "10px";
    instruction.style.marginBottom = "10px";
    instruction.style.display = "none";

    const leftPanel = document.querySelector(".left-panel");
    leftPanel.insertBefore(instruction, canvas);
    // rightPanel.style.display = "none";
    const resetButton = document.getElementById("resetButton");

    resetButton.addEventListener("click", function () {
        selectedColors = [];
        colorList.innerHTML = "";
        results.innerHTML = "";
        instruction.style.display = "none";
        instructionsAdded = false;
    });

    fileInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                img = new Image();
                img.onload = function () {
                    adjustCanvasSize();
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    instruction.style.display = "block";
                    imageLoaded = true;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    function adjustCanvasSize() {
        const maxWidth = window.innerWidth * 0.8;
        const maxHeight = window.innerHeight * 0.8;
        let scale = Math.min(maxWidth / img.width, maxHeight / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
    }

    window.addEventListener("resize", function () {
        if (imageLoaded) {
            adjustCanvasSize();
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
    });

    function getAverageColor(x, y, size = 5) {
        if (!imageLoaded) return { r: 0, g: 0, b: 0 };
        
        let totalR = 0, totalG = 0, totalB = 0, count = 0;

        for (let dx = -Math.floor(size / 2); dx <= Math.floor(size / 2); dx++) {
            for (let dy = -Math.floor(size / 2); dy <= Math.floor(size / 2); dy++) {
                const px = Math.min(Math.max(x + dx, 0), canvas.width - 1);
                const py = Math.min(Math.max(y + dy, 0), canvas.height - 1);
                const pixel = ctx.getImageData(px, py, 1, 1).data;
                totalR += pixel[0];
                totalG += pixel[1];
                totalB += pixel[2];
                count++;
            }
        }

        return {
            r: Math.round(totalR / count),
            g: Math.round(totalG / count),
            b: Math.round(totalB / count)
        };
    }
        //qua aggiunto parte di LAB
    function rgbToLab(r, g, b) {
        function pivot(v) {
            return v > 0.008856 ? Math.pow(v, 1/3) : (7.787 * v) + (16 / 116);
        }
            
        r /= 255, g /= 255, b /= 255;
        r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
            
        let x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
        let y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) / 1.00000;
        let z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;
            
        x = pivot(x);
        y = pivot(y);
        z = pivot(z);
            
        return {
            l: (116 * y) - 16,
            a: 500 * (x - y),
            b: 200 * (y - z)
        };
    }

    canvas.addEventListener("click", function (event) {
        if (!imageLoaded) return;
        
        if (!instructionsAdded) {
            rightPanel.style.display = "block";
            instructionsAdded = true;
        }
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.round((event.clientX - rect.left) * scaleX);
        const y = Math.round((event.clientY - rect.top) * scaleY);
        
        const avgColor = getAverageColor(x, y, 5);
        const color = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`;
        
        let label = selectedColors.length === 0 ? "Résultat du test" : `Référence ${selectedColors.length}`;
        selectedColors.push({ r: avgColor.r, g: avgColor.g, b: avgColor.b, color, label });
        updateColorList();
        if (selectedColors.length > 1) {
            calculateDistances(selectedColors[0]);
        }
    });

    function updateColorList() {
        colorList.innerHTML = "";
        selectedColors.forEach((col, index) => {
            const div = document.createElement("div");
            div.style.backgroundColor = col.color;
            div.textContent = col.label;
            div.style.padding = "10px";
            div.style.margin = "5px";
            div.style.cursor = "pointer";
            div.tabIndex = 0; 
            div.title = `Code couleur: ${col.color}`; 

            div.addEventListener("keydown", function (event) {
                if (event.key === "Delete" || event.key === "Backspace") {
                    selectedColors.splice(index, 1);
                    updateColorList();
                    if (selectedColors.length > 1) {
                        calculateDistances(selectedColors[0]);
                    } else {
                        results.innerHTML = "";
                    }
                }
            });
            colorList.appendChild(div);
        });
    }

    function calculateCIEDE2000(lab1, lab2) {
        return Math.sqrt(
            Math.pow(lab2.l - lab1.l, 2) +
            Math.pow(lab2.a - lab1.a, 2) +
            Math.pow(lab2.b - lab1.b, 2)
        );
    }

    function calculateDistances(selected) {
        let distancesRGB = [];
        let distancesLAB = [];
        const labSelected = rgbToLab(selected.r, selected.g, selected.b);

        selectedColors.forEach((col) => {
            if (col !== selected) {
                const distanceRGB = Math.sqrt(
                    Math.pow(col.r - selected.r, 2) +
                    Math.pow(col.g - selected.g, 2) +
                    Math.pow(col.b - selected.b, 2)
                );
                
                const labCol = rgbToLab(col.r, col.g, col.b);
                const distanceLAB = calculateCIEDE2000(labSelected, labCol);
                
                distancesRGB.push({ color: col.color, label: col.label, distance: distanceRGB });
                distancesLAB.push({ color: col.color, label: col.label, distance: distanceLAB });
            }
        });
        
        distancesRGB.sort((a, b) => a.distance - b.distance);
        distancesLAB.sort((a, b) => a.distance - b.distance);
        displayResults(distancesRGB, distancesLAB);
    }


    function displayResults(distancesRGB, distancesLAB) {
        results.innerHTML = "";

        function createResultSection(title, distances) {
            if (distances.length > 0) {
                let section = `<h3>${title}</h3>`;
                section += `<p><strong>${distances[0].label}</strong> (${distances[0].distance.toFixed(2)})</p>`;
                if (distances.length > 1) {
                    section += `<p><strong>${distances[1].label}</strong> (${distances[1].distance.toFixed(2)})</p>`;
                }
                return section;
            }
            return "";
        }

        results.innerHTML += createResultSection("Distance Euclidienne (RGB)", distancesRGB);
        results.innerHTML += createResultSection("Distance CIEDE2000 (LAB)", distancesLAB);
    }
    // aggiunata la possibilità di cancellare con il tasto delete 
    document.addEventListener("keydown", function (event) {
        if ((event.key === "Delete" || event.key === "Backspace") && selectedColors.length > 0) {
            selectedColors.pop();
            updateColorList();
            if (selectedColors.length > 1) {
                calculateDistances(selectedColors[0]);
            } else {
                results.innerHTML = "";
            }
        }
    });
});