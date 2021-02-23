/* Webpage Client */
var ws = new WebSocket("wss://control.markstuff.net:8080")
	ws.onopen = function() {
		document.getElementById("serverStatus").innerText = "Server Status: Connected to server"
	}
	
    ws.onmessage = function (evt) {
        var msg = evt.data
        //console.log(msg)
		var args = msg.split(" ")
		
		switch(args[0]) {
			case "speed":
				//controllerClient setting toy speed
				var id = args[1]
				var speed = args[2]
				var toy = myToys.get(id)
				var edgeVibrator = ""
				if (args.length == 4) {
					edgeVibrator = args[3]
				}
				send(toy.url + "/Vibrate" + edgeVibrator + "?v=" + speed + "&t=" + id)
				document.getElementById(id + "speed" + edgeVibrator).value = speed
			break;
			case "air":
				var id = args[1]
				var speed = args[2]
				var toy = myToys.get(id)
				send(toy.url + "/AirAuto?v=" + speed + "&t=" + id)
				document.getElementById(id + "air").value = speed
			break;
			case "rotate":
				var id = args[1]
				var toy = myToys.get(id)
				send(toy.url + "/RotateChange&t=" + id)
			break;
			case "id":
				//server assigining an ID
				document.getElementById("codeDisplay").style.display = "block";
				document.getElementById("id").innerText = args[1]
				document.getElementById("serverStatus").innerText = "Server Status: Received code from server"
				hasCode = true
			break;
			case "joined":
				//controllerClient joined, session is active
				//send controllerClient toy name and ids
				var str = ""
				for (const [id, toy] of myToys.entries()) {
					if (toy.share)
						str += toy.name + ":" + id + " "
				}
				str = str.slice(0, -1)//remove space at end
				ws.send("toys " + str);
			
				active = true
				document.getElementById("serverStatus").innerText = "Server Status: Control Client joined!"
			break;
			case "left":
				//controllerClient left, moved back to waiting room
				active = false
				document.getElementById("serverStatus").innerText = "Server Status: Control Client left!"
			break;
		}
    }
	
    ws.onclose = function() {
        document.getElementById("serverStatus").innerText = "Server Status: Disconnected from server"
    }

var hasCode = false
var active = false
let myToys = new Map()
	
function getCode() {
	if (!hasCode) {
	ws.send('new')
	}
}
	
//commands waiting to send
let stack = []
	
const http = new XMLHttpRequest()
http.onreadystatechange = function() {
	if (http.readyState === 4) {
		if (stack.length != 0) {
			http.open("POST", "https://" + stack.shift())
			http.send()
		}
    }
}
	
//send data to toy
function send(url) {
	//console.log("Sending: " + url)
	if (stack.length != 0) {
		stack.push(url)
		return;
	}
	http.open("POST", "https://" + url)
	http.send()
}

//check toy status every minute
(function loop() {
	if (myToys.size != 0)
		searchForToys()

setTimeout(loop, 10000);})();

function toggle(button) {
	var id = button.id
	var toy = myToys.get(id)
	
	if (toy.share) {
		toy.share = false
		document.getElementById(id).style.backgroundColor = "#a80a2a"
		if (active)
			ws.send("remove " + toy.name + ":" + id)
	} else {
		toy.share = true
		document.getElementById(id).style.backgroundColor = "#33a151"
		if (active)
			ws.send("add " + toy.name + ":" + id)
	}
	
	fixToolTip(id)
}

var storedIP = localStorage.getItem("ip")
if (storedIP != undefined) {
	document.getElementById("ip").value = storedIP
}
	
function searchForToys() {
	document.getElementById("searchButton").innerHTML = "Refresh"
	
	var link = "https://api.lovense.com/api/lan/getToys"
	
	if (document.getElementById("error").style.display == "block") {
	var ip = document.getElementById("ip").value
	if (ip != "") {
		ip = ip.replace(/\./g, "-")
		link = "https://" + ip + ".lovense.club:34568/GetToys"
		localStorage.setItem("ip", ip)
	}
	}

	var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
		var json = JSON.parse(xmlHttp.responseText);
		if (json == undefined) return
		
		for (var phone of Object.keys(json)) {
		var phoneJson = json[phone]
		var host = phoneJson["domain"]
		var port = phoneJson["httpsPort"]
		var toys = phoneJson["toys"]
		
		if (toys == undefined) {
			toys = json["data"]
			host = link.substring(0, link.length - 8)
		} else {
			host += ":" + port
		}
		
		for (var toy of Object.keys(toys)) {
			var toyJson = toys[toy]
			addToy(toyJson, host);
		}
	}
	
	if (myToys.size == 0) {
		document.getElementById("error").style.display = "block";
	} else {
		document.getElementById("error").style.display = "none";
		getCode()
	}
	
    }
    xmlHttp.open("GET", link, true); 
    xmlHttp.send(null);
}

function fixToolTip(id) {
	var toy = myToys.get(id)
	document.getElementById(id).childNodes[1].innerHTML = "Sharing:" + ((toy.share) == true ? 'on' : 'off')  + "<br>Status: " + ((toy.status) == 1 ? 'Active' : 'Inactive') + "<br>ID: " + id + "<br>Host: " + toy.url
	if (toy.status == 0) {
		document.getElementById(id).disabled = true
		document.getElementById(id).style.backgroundColor = "#a80a2a"
	} else {
		document.getElementById(id).disabled = false
		//document.getElementById(id).style.backgroundColor = "#33a151"
	}
}

function addToy(toyJson, host) {
	var id = toyJson["id"]
	var name = toyJson["name"]
	var status = toyJson["status"]
	
	//if (document.getElementById(id) != null) return;
	name = name.charAt(0).toUpperCase() + name.slice(1)
	
	var toy = myToys.get(id)
	if (toy != undefined) {
		if (toy.status != status) {
			toy.status = status
			fixToolTip(id)
			
	if (toy.status == 0) {
		if (toy.share) toggle(document.getElementById(id))
	} else {
		if (!toy.share) toggle(document.getElementById(id))
	}
			
		}
		return
	}
			
	myToys.set(id, {url: host, share: true, name: name, status: status})
			
	var button = document.createElement("button")
	button.id = id
	button.innerHTML = name
	button.className = "tooltip"
	button.onclick = function() {toggle(button)}
	button.style.backgroundColor = "#33a151"	
	
	var tooltip = document.createElement("span")
	tooltip.className = "tooltiptext"
	button.appendChild(tooltip)
	
	var row = document.createElement("tr")
	var col = document.createElement("th")
	document.getElementById("table").appendChild(row)
	row.appendChild(col)
	col.appendChild(button)
	
	var col2 = document.createElement("th")
	var slider = document.createElement("input")
	slider.type = "range"
	slider.min = 0
	slider.max = 10
	slider.value = 0
	
	if (name == "Edge") {
		slider.oninput = function() {setSpeed(id, "1")}
		slider.id = id + "speed1"
	} else {
		slider.oninput = function() {setSpeed(id, "")}
		slider.id = id + "speed"
	}
	
	col2.appendChild(slider)
	row.appendChild(col2)

	if (name == "Edge") {
		var col3 = document.createElement("th")
		var slider = document.createElement("input")
		slider.type = "range"
		slider.min = 0
		slider.max = 10
		slider.value = 0
		slider.id = id + "speed2"
		slider.oninput = function() {setSpeed(id, "2")}
		col3.appendChild(slider)
		row.appendChild(col3)
	}

	if (name == "Nora") {
		var col3 = document.createElement("th")
		var button2 = document.createElement("button")
		button2.innerHTML = "Rotate"
		button2.onclick = function() {rotateNora(id)}
		button2.style.backgroundColor = "#33a151"
		col3.appendChild(button2)
		row.appendChild(col3)
	}

	if (name == "Max") {
		var col3 = document.createElement("th")
		var slider = document.createElement("input")
		slider.type = "range"
		slider.min = 0
		slider.max = 3
		slider.value = 0
		slider.id = id + "air"
		slider.oninput = function() {airMax(id)}
		col3.appendChild(slider)
		row.appendChild(col3)
	}
	
	fixToolTip(id)
}


function setSpeed(id, vibrator) {
	var speed = document.getElementById(id + "speed" + vibrator).value
	var toy = myToys.get(id)
	send(toy.url + "/Vibrate" + vibrator + "?v=" + speed + "&t=" + id)
}

function rotateNora(id) {
	var toy = myToys.get(id)
	send(toy.url + "/RotateChange&t=" + id)
}

function airMax(id) {
	var speed = document.getElementById(id + "air").value
	var toy = myToys.get(id)
	send(toy.url + "/AirAuto?v=" + speed + "&t=" + id)
}
