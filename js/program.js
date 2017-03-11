(function(module) {
    function Program(opt) {
        /*
         * 必须参数
         * name 名称
         * vs 顶点着色器script id
         * fs 片段着色器script id
         * attributes
         * uniforms
         */

        var vsScript = document.getElementById(opt.vs).innerText;
        var fsScript = document.getElementById(opt.fs).innerText;

        var vs = webgl.createShader(webgl.VERTEX_SHADER);
        var fs = webgl.createShader(webgl.FRAGMENT_SHADER);

        this.name = opt.name;

        webgl.shaderSource(vs, vsScript);
        webgl.shaderSource(fs, fsScript);

        webgl.compileShader(vs);
        webgl.compileShader(fs);

        if(!webgl.getShaderParameter(vs, webgl.COMPILE_STATUS)) {
            alert(this.name + ' vs error');
        }

        if(!webgl.getShaderParameter(fs, webgl.COMPILE_STATUS)) {
            alert(this.name + ' fs error');
        }

        var program = webgl.createProgram();

        webgl.attachShader(program, vs);
        webgl.attachShader(program, fs);

        webgl.linkProgram(program);

        this.program = program;

        var i = 0;
        var attributes = opt.attributes;
        var uniforms = opt.uniforms;

        for(; i < attributes.length; i++) {
            this[attributes[i]] = webgl.getAttribLocation(program, attributes[i]);

            webgl.enableVertexAttribArray(this[attributes[i]]);
        }


        for(i = 0; i < uniforms.length; i++) {
            this[uniforms[i]] = webgl.getUniformLocation(program, uniforms[i]);
        }
    }

    Program.prototype.execute = function(cmd, attr, args) {
        args.unshift(this[attr]);
        webgl[cmd].apply(webgl, args);
    };

    Program.prototype.use = function() {
        webgl.useProgram(this.program);
    };

    module.Program = Program;

})(window);