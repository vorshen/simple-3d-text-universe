(function(module) {

    function Text3d(opt) {
        this.position = [0, 0, 0];
        this.index = [];

        this.normalArr = [0, 0, 0];
        this.normal = [];

        this.uvArr = [0, 0];
        this.uv = [];

        this.poBuf = webgl.createBuffer();
        this.uvBuf = webgl.createBuffer();
        this.indexBuf = webgl.createBuffer();

        this.mtl = {};

        // 初始自转为0
        this.angle = 0;

        // 自转速度
        this.rotate = opt.rotate || 0.01;

        // 初始偏移
        this.x = opt.x || 0;
        this.y = opt.y || 0;
        this.z = opt.z || 0;

        this.revolution = opt.revolution || 0.01;

        this.program = opt.program;

        this.loadObj(opt.obj);
        
    }

    Text3d.prototype.loadObj = function(src) {
        var arr = [];
        var temp;
        var self = this;

        loadFile(src, function(result) {
            arr = handleLine(result);

            arr.forEach(function(item) {

                handleWord(item, self);

            });

            self.inited();
        });
    };

    Text3d.prototype.loadMtl = function(src) {
        var arr = [];
        var self = this;

        loadFile(src, function(result) {
            arr = handleLine(result);

            arr.forEach(function(item) {
                if((result = /^map_Kd\s+([\d|\.|\w]+)/.exec(item)) !== null) {
                    self.mtl = result[1];
                }
            });
        });
    };

    Text3d.prototype.loadImg = function(key) {
        var image = new Image();
        var self = this;

        image.onload = function() {
            self.texture = webgl.createTexture();
            webgl.activeTexture(webgl.TEXTURE0);
            webgl.bindTexture(webgl.TEXTURE_2D, self.texture);
            webgl.pixelStorei(webgl.UNPACK_FLIP_Y_WEBGL, true);
            webgl.texImage2D(webgl.TEXTURE_2D, 0, webgl.RGBA, webgl.RGBA, webgl.UNSIGNED_BYTE, image);

            webgl.texParameteri(
                webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.NEAREST
            );
            webgl.texParameteri(
                webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.NEAREST
            );
            webgl.texParameteri(
                webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.MIRRORED_REPEAT
                );
            webgl.texParameteri(
                webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.MIRRORED_REPEAT
                );
        };

        image.src = this.mtl;
    }

    Text3d.prototype.inited = function() {
        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.poBuf);
        webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(this.position), webgl.STATIC_DRAW);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.uvBuf);
        webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(this.uv), webgl.STATIC_DRAW);

        webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, this.indexBuf);
        webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.index), webgl.STATIC_DRAW);
    };

    Text3d.prototype.addFace = function(data) {
        this.addIndex(+data[1], +data[4], +data[7], +data[10]);
        this.addUv(+data[2], +data[5], +data[8], +data[11]);
        this.addNormal(+data[3], +data[6], +data[9], +data[12]);
    };

    Text3d.prototype.addIndex = function(a, b, c, d) {
        if(!d) {
            this.index.push(a, b, c);
        } else {
            this.index.push(a, b, c, a, c, d);
        }
    };

    Text3d.prototype.addNormal = function(a, b, c, d) {
        if(!d) {
            this.normal.push(
                3 * this.normalArr[a], 3 * this.normalArr[a] + 1, 3 * this.normalArr[a] + 2,
                3 * this.normalArr[b], 3 * this.normalArr[b] + 1, 3 * this.normalArr[b] + 2,
                3 * this.normalArr[c], 3 * this.normalArr[c] + 1, 3 * this.normalArr[c] + 2
            );
        } else {
            this.normal.push(
                3 * this.normalArr[a], 3 * this.normalArr[a] + 1, 3 * this.normalArr[a] + 2,
                3 * this.normalArr[b], 3 * this.normalArr[b] + 1, 3 * this.normalArr[b] + 2,
                3 * this.normalArr[c], 3 * this.normalArr[c] + 1, 3 * this.normalArr[c] + 2,
                3 * this.normalArr[a], 3 * this.normalArr[a] + 1, 3 * this.normalArr[a] + 2,
                3 * this.normalArr[c], 3 * this.normalArr[c] + 1, 3 * this.normalArr[c] + 2,
                3 * this.normalArr[d], 3 * this.normalArr[d] + 1, 3 * this.normalArr[d] + 2
            );
        }
    };

    Text3d.prototype.addUv = function(a, b, c, d) {
        if(!d) {
            this.uv.push(2 * this.uvArr[a], 2 * this.uvArr[a] + 1);
            this.uv.push(2 * this.uvArr[b], 2 * this.uvArr[b] + 1);
            this.uv.push(2 * this.uvArr[c], 2 * this.uvArr[c] + 1);
        } else {
            this.uv.push(2 * this.uvArr[a], 2 * this.uvArr[a] + 1);
            this.uv.push(2 * this.uvArr[b], 2 * this.uvArr[b] + 1);
            this.uv.push(2 * this.uvArr[c], 2 * this.uvArr[c] + 1);
            this.uv.push(2 * this.uvArr[d], 2 * this.uvArr[d] + 1);
        }
    };

    Text3d.prototype.render = function() {
        this.angle += this.rotate;

        var s = Math.sin(this.angle);
        var c = Math.cos(this.angle);

        var gs = Math.sin(globalTime * this.revolution);
        var gc = Math.cos(globalTime * this.revolution);


        webgl.uniformMatrix4fv(
            this.program.uMMatrix, false, mat4.multiply([
                    gc,0,-gs,0,
                    0,1,0,0,
                    gs,0,gc,0,
                    0,0,0,1
                ], mat4.multiply(
                    [
                        1,0,0,0,
                        0,1,0,0,
                        0,0,1,0,
                        this.x,this.y,this.z,1
                    ],[
                        c,0,-s,0,
                        0,1,0,0,
                        s,0,c,0,
                        0,0,0,1
                    ]
                )
            )
        );

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.poBuf);
        webgl.vertexAttribPointer(this.program.aPosition, 3, webgl.FLOAT, false, 0, 0);

        webgl.bindBuffer(webgl.ARRAY_BUFFER, this.uvBuf);
        webgl.vertexAttribPointer(this.program.aUv, 2, webgl.FLOAT, false, 0, 0);

        webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, this.indexBuf);

        webgl.bindTexture(webgl.TEXTURE_2D, this.texture);

        webgl.drawElements(webgl.TRIANGLES, this.index.length, webgl.UNSIGNED_SHORT, 0);

        
    };

    module.Text3d = Text3d;

    var regex = {
        vertex_pattern: /^v\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
        normal_pattern: /^vn\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
        uv_pattern: /^vt\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
        face_vertex_uv_normal: /^f\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)(?:\s+(-?\d+)\/(-?\d+)\/(-?\d+))?/,
        material_library_pattern: /^mtllib\s+([\d|\w|\.]+)/,
        material_use_pattern: /^usemtl\s+([\S]+)/
    };

    function loadFile(src, cb) {
        var xhr = new XMLHttpRequest();

        xhr.open('get', src, false);

        xhr.onreadystatechange = function() {
            if(xhr.readyState === 4) {

                cb(xhr.responseText);
            }
        };

        xhr.send();
    }

    function handleLine(str) {
        var result = [];
        result = str.split('\n');

        for(var i = 0; i < result.length; i++) {
            if(/^#/.test(result[i]) || !result[i]) {
                result.splice(i, 1);

                i--;
            }
        }

        return result;
    }

    function handleWord(str, obj) {
        var firstChar = str.charAt(0);
        var secondChar;
        var result;

        if(firstChar === 'v') {
            
            secondChar = str.charAt(1);

            if(secondChar === ' ' && (result = regex.vertex_pattern.exec(str)) !== null) {
                obj.position.push(+result[1], +result[2], +result[3]);
            } else if(secondChar === 'n' && (result = regex.normal_pattern.exec(str)) !== null) {
                obj.normalArr.push(+result[1], +result[2], +result[3]);
            } else if(secondChar === 't' && (result = regex.uv_pattern.exec(str)) !== null) {
                obj.uvArr.push(+result[1], +result[2]);
            }

        } else if(firstChar === 'f') {
            if((result = regex.face_vertex_uv_normal.exec(str)) !== null) {
                obj.addFace(result);
            }
        } else if((result = regex.material_library_pattern.exec(str)) !== null) {
            obj.loadMtl(result[1]);
        } else if((result = regex.material_use_pattern.exec(str)) !== null) {
            obj.loadImg(result[1]);
        }
    }
})(window);
