/* Source: https://www.w3schools.com/colors/colors_converter.asp */
/* Cherry picked, modified and beautified */

function convertColor() {
	color = document.getElementById("color01").value;
	if (color == "") {
		validateColor();
		return;
	}
	color = color.toLowerCase();
	c = w3color(color);
	if (c.valid) {
		document.getElementById("resultTable").style.display = "table";
		document.getElementById("error01").innerHTML = "";
		document.getElementById("result01").style.backgroundColor = c.toRgbaString();

		// Added: Calculate inverse color
		var hsl = c.toHsl();
		var inverted = "hsl(" + parseInt(Math.abs(360 - hsl.h)) + ", " + (hsl.s * 100) + "%, " + (hsl.l * 100) + "%)";
		document.getElementById("result01").style.color = inverted;
		document.getElementById("result01").innerHTML = "Inverted (opposite) color:<br>" + inverted;

		if (c.toName() == "") {
			document.getElementById("name01").style.fontStyle = "italic";
			document.getElementById("name01").style.color = "#757575";
			document.getElementById("name01").innerHTML = "no name";
		} else {
			document.getElementById("name01").style.fontStyle = "normal";
			document.getElementById("name01").style.color = "#000000";
			document.getElementById("name01").innerHTML = c.toName();
		}
		document.getElementById("helpname01").innerHTML = "Name";
		document.getElementById("hex01").innerHTML = c.toHexString();
		document.getElementById("helphex01").innerHTML = "Hex";
		document.getElementById("cmyk01").innerHTML = c.toCmykString();
		document.getElementById("helpcmyk01").innerHTML = "Cmyk";
		document.getElementById("helpncol01").innerHTML = "Ncol";
		if (
			(color.indexOf("rgba") > -1 ||
				color.indexOf("hsla") > -1 ||
				color.indexOf("hwba") > -1 ||
				color.indexOf("ncola")) > -1 ||
			(color.indexOf("cmyk") == -1 && color.split(",").length == 4) ||
			(color.indexOf("cmyk") > -1 && color.split(",").length == 5)
		) {
			document.getElementById("rgb01").innerHTML = c.toRgbaString();
			document.getElementById("hsl01").innerHTML = c.toHslaString();
			document.getElementById("hwb01").innerHTML = c.toHwbaString();
			document.getElementById("ncol01").innerHTML = c.toNcolaString();
			document.getElementById("helprgb01").innerHTML = "Rgba";
			document.getElementById("helphsl01").innerHTML = "Hsla";
			document.getElementById("helphwb01").innerHTML = "Hwba";
		} else {
			document.getElementById("rgb01").innerHTML = c.toRgbString();
			document.getElementById("hsl01").innerHTML = c.toHslString();
			document.getElementById("hwb01").innerHTML = c.toHwbString();
			document.getElementById("ncol01").innerHTML = c.toNcolString();
		}
		document.getElementById("helprgb01").innerHTML = "Rgb";
		document.getElementById("helphsl01").innerHTML = "Hsl";
		document.getElementById("helphwb01").innerHTML = "Hwb";
	} else {
		validateColor();
	}
}
function validateColor() {
	var color, c, x, i, l;
	color = document.getElementById("color01").value;
	c = w3color(color);
	if (color == "" || !c.valid) {
		document.getElementById("result01").style.backgroundColor = "#f1f1f1";
		document.getElementById("resultTable").style.display = "none";
		document.getElementById("error01").innerHTML = "Not a legal color value";
		document.getElementById("hex01").innerHTML = "";
		document.getElementById("rgb01").innerHTML = "";
		document.getElementById("hsl01").innerHTML = "";
		document.getElementById("hwb01").innerHTML = "";
		document.getElementById("ncol01").innerHTML = "";
		document.getElementById("helpname01").innerHTML = "";
		document.getElementById("helphex01").innerHTML = "";
		document.getElementById("helprgb01").innerHTML = "";
		document.getElementById("helphsl01").innerHTML = "";
		document.getElementById("helphwb01").innerHTML = "";
		document.getElementById("helpncol01").innerHTML = "";
	} else {
		document.getElementById("resultTable").style.display = "table";
		document.getElementById("error01").innerHTML = "";

		convertColor();
		document.getElementById("html5colorpicker").value = c.toHexString();
	}
}
function colorPicked() {
	changeColor();
}
function changeColor() {
	convertColor();
	hslTable("hue");
	hslTable("sat");
	hslTable("light");
}
function colorClicked(hex) {
	document.getElementById("html5colorpicker").value = hex;
	document.getElementById("color01").value = hex;
	changeColor();
}

function hslTable(x) {
	var lineno, header, i, a, match, same, comp, loopHSL, HSL;
	var color = document.getElementById("color01").value;
	var hslObj = w3color(color);
	var h = hslObj.hue;
	var s = hslObj.sat;
	var l = hslObj.lightness;
	var arr = [];
	if (x == "hue") {
		header = "Hue";
		lineno = 24;
	}
	if (x == "sat") {
		header = "Saturation";
		lineno = 20;
	}
	if (x == "light") {
		header = "Lightness";
		lineno = 20;
	}
	for (i = 0; i <= lineno; i++) {
		if (x == "hue") {
			arr.push(w3color("hsl(" + i * 15 + "," + s + "," + l + ")"));
		}
		if (x == "sat") {
			arr.push(w3color("hsl(" + h + "," + i * 0.05 + "," + l + ")"));
		}
		if (x == "light") {
			arr.push(w3color("hsl(" + h + "," + s + "," + i * 0.05 + ")"));
		}
	}
	if (x == "sat" || x == "light") {
		arr.reverse();
	}
	a = "<h3>" + header + "</h3>";
	a += "<div>";
	a += "<table style='width:100%;white-space: nowrap;font-size:14px;'>";
	a += "<tr>";
	a += "<th style='width:150px;'></th>";
	a +=
		"<th style='text-align:right;text-transform:capitalize;'>" +
		x +
		"&nbsp;</th>";
	a += "<th style='text-align:right;'>Hex</th>";
	a += "<th style='text-align:right;'>Rgb</th>";
	a += "<th style='text-align:right;'>Hsl</th>";
	a += "</tr>";
	match = 0;
	for (i = 0; i < arr.length; i++) {
		same = 0;
		if (x == "hue") {
			loopHSL = w3color(arr[i]).hue;
			HSL = h;
			if (i == arr.length - 1) {
				loopHSL = 360;
			}
			comp = loopHSL > HSL;
		}
		if (x == "sat") {
			loopHSL = Math.round(w3color(arr[i]).sat * 100);
			HSL = Number(s * 100);
			HSL = Math.round(HSL);
			comp = loopHSL < HSL;
			HSL = HSL + "%";
			loopHSL = loopHSL + "%";
		}
		if (x == "light") {
			loopHSL = Math.round(w3color(arr[i]).lightness * 100);
			HSL = Number(l * 100);
			HSL = Math.round(HSL);
			comp = loopHSL < HSL;
			HSL = HSL + "%";
			loopHSL = loopHSL + "%";
		}
		if (HSL == loopHSL) {
			match++;
			same = 1;
		}
		if (comp) {
			match++;
		}
		if (match == 1) {
			a += "<tr style='background-color: hsl(125, 21%, 77%); color: white;'>";
			a += "<td style='background-color:" + hslObj.toHexString() + "'></td>";
			a += "<td style='text-align:right;'><b>" + HSL + "&nbsp;</b></td>";
			a += "<td style='text-align:right;'><b>" + hslObj.toHexString() + "</b></td>";
			a += "<td style='text-align:right;'><b>" + hslObj.toRgbString() + "</b></td>";
			a += "<td style='text-align:right;'><b>" + hslObj.toHslString() + "</b></td>";
			a += "</tr>";
			match = 2;
		}
		if (same == 0) {
			a += "<tr>";
			a +=
				"<td style='cursor:pointer;background-color:" +
				arr[i].toHexString() +
				"' onclick='colorClicked(\"" +
				arr[i].toHexString() +
				"\")'></td>";
			a += "<td style='text-align:right;'>" + loopHSL + "&nbsp;</td>";
			a += "<td style='text-align:right;'>" + arr[i].toHexString() + "</td>";
			a += "<td style='text-align:right;'>" + arr[i].toRgbString() + "</td>";
			a += "<td style='text-align:right;'>" + arr[i].toHslString() + "</td>";
			a += "</tr>";
		}
	}
	a += "</table></div>";
	if (x == "hue") {
		document.getElementById("huecontainer").innerHTML = a;
	}
	if (x == "sat") {
		document.getElementById("hslsatcontainer").innerHTML = a;
	}
	if (x == "light") {
		document.getElementById("hsllumcontainer").innerHTML = a;
	}
}

// Added, table of named colors
function namedsColors() {
	var arr = w3color("black");
	var colorHex = arr.getColorArr("hexs");
	var colorNames = arr.getColorArr("names");

	a = "<table style='width:100%;white-space: nowrap;font-size:14px;'>";
	a += "<tr>";
	a += "<th style='text-align:right;'>Color</th>";
	a += "<th style='text-align:right;'>Hex</th>";
	a += "<th style='text-align:right;'>Rgb</th>";
	a += "<th style='text-align:right;'>Hsl</th>";
	a += "</tr>";

	for (i = 0; i < colorNames.length; i++) {
		var obj = w3color(colorNames[i]);
		a += "<tr onclick='colorClicked(\"" + colorHex[i] + "\")'>";
		a += "<td style='text-align:right; background-color: #" + colorHex[i] + ";'>" + colorNames[i] + "</td>";
		a += "<td style='text-align:right;'>#" + colorHex[i] + "</td>";
		a += "<td style='text-align:right;'>" + obj.toRgbString() + "</td>";
		a += "<td style='text-align:right;'>" + obj.toHslString() + "</td>";
		a += "</tr>";
	}

	a += "</table>";

	document.getElementById("namescontainer").innerHTML = a;
}
