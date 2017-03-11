(function(module) {
	function Points(opt) {
	    var max = opt.max;

	    this.time = 0;

	    this.program = opt.program;
	    this.vertexData = new Float32Array(max * 3);
	    this.sizeData = new Float32Array(max);

	    this.showData = new Float32Array(max);

	    this.poBuf = webgl.createBuffer();
	    this.sizeBuf = webgl.createBuffer();

	    this.length = max;

	    var i = 0;

	    for(; i < max; i++) {
	        this.sizeData[i] = Math.random() * 5 + 3;

	        this.showData[i] = (Math.random() * 10) >> 0;

	        this.vertexData[3 * i] = Math.random() * 2 - 1;
	        this.vertexData[3 * i + 1] = Math.random() * 2 - 1;
	        this.vertexData[3 * i + 2] = Math.random() * 2 - 1;;
	    }
	}

	Points.prototype.draw = function() {
	    var i = 0;

	    for(; i < this.showData.length; i++) {
	        if(this.time !== this.showData[i]) {
	            continue;
	        }
	        if(this.vertexData[3 * i + 2] < -100) {
	            this.vertexData[3 * i + 2] += 200;

	        } else {
	            this.vertexData[3 * i + 2] -= 200;
	        }
	    }

	    this.time++;

	    if(this.time >= 10) {
	        this.time = 0;
	    }

	    
	    webgl.bindBuffer(webgl.ARRAY_BUFFER, this.poBuf);
	    webgl.bufferData(webgl.ARRAY_BUFFER, this.vertexData, webgl.STATIC_DRAW);
	    webgl.vertexAttribPointer(this.program.aPosition, 3, webgl.FLOAT, false, 0, 0);

	    webgl.bindBuffer(webgl.ARRAY_BUFFER, this.sizeBuf);
	    webgl.bufferData(webgl.ARRAY_BUFFER, this.sizeData, webgl.STATIC_DRAW);
	    webgl.vertexAttribPointer(this.program.aSize, 1, webgl.FLOAT, false, 0, 0);

	    webgl.drawArrays(webgl.POINTS, 0, this.length);
	}

	module.Points = Points;
})(window);