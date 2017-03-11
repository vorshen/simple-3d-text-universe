Webgl的魅力在于可以创造一个自己的3D世界，但相比较canvas2D来说，除了物体的移动旋转变换完全依赖矩阵增加了复杂度，就连生成一个物体都变得很复杂。

什么？！为什么不用Threejs？Threejs等库确实可以很大程度的提高开发效率，而且各方面封装的非常棒，但是不推荐初学者直接依赖Threejs，最好是把webgl各方面都学会，再去拥抱Three等相关库。

上篇矩阵入门中介绍了矩阵的基本知识，让大家了解到了基本的仿射变换矩阵，可以对物体进行移动旋转等变化，而这篇文章将教大家快速生成一个物体，并且结合变换矩阵在物体在你的世界里动起来。

**注：本文适合稍微有点webgl基础的人同学，至少知道shader，知道如果画一个物体在webgl画布中**

## 为什么说webgl生成物体麻烦
我们先稍微对比下基本图形的创建代码
矩形：
canvas2D
    ctx1.rect(50, 50, 100, 100);
    ctx1.fill();

webgl(shader和webgl环境代码忽略)
    var aPo = [
        -0.5, -0.5, 0,
        0.5, -0.5, 0,
        0.5, 0.5, 0,
        -0.5, 0.5, 0
    ];

    var aIndex = [0, 1, 2, 0, 2, 3];

    webgl.bindBuffer(webgl.ARRAY_BUFFER, webgl.createBuffer());
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(aPo), webgl.STATIC_DRAW);
    webgl.vertexAttribPointer(aPosition, 3, webgl.FLOAT, false, 0, 0);

    webgl.vertexAttrib3f(aColor, 0, 0, 0);

    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, webgl.createBuffer());
    webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, new Uint16Array(aIndex), webgl.STATIC_DRAW);

    webgl.drawElements(webgl.TRIANGLES, 6, webgl.UNSIGNED_SHORT, 0);

完整代码地址：[]()
结果：
图图图图图图图图图图图图

圆：
canvas2D
    ctx1.arc(100, 100, 50, 0, Math.PI * 2, false);
    ctx1.fill();

webgl
    var angle;
    var x, y;
    var aPo = [0, 0, 0];
    var aIndex = [];
    var s = 1;
    for(var i = 1; i <= 36; i++) {
        angle = Math.PI * 2 * (i / 36);
        x = Math.cos(angle) * 0.5;
        y = Math.sin(angle) * 0.5;

        aPo.push(x, y, 0);

        aIndex.push(0, s, s+1);

        s++;
    }
    
    aIndex[aIndex.length - 1] = 1; // hack一下

    webgl.bindBuffer(webgl.ARRAY_BUFFER, webgl.createBuffer());
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(aPo), webgl.STATIC_DRAW);
    webgl.vertexAttribPointer(aPosition, 3, webgl.FLOAT, false, 0, 0);

    webgl.vertexAttrib3f(aColor, 0, 0, 0);

    webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, webgl.createBuffer());
    webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, new Uint16Array(aIndex), webgl.STATIC_DRAW);

    webgl.drawElements(webgl.TRIANGLES, aIndex.length, webgl.UNSIGNED_SHORT, 0);

完整代码地址：[]()
结果：
图图图图图图图图图图图图

总结：我们抛开shader中的代码和webgl初始化环境的代码，发现webgl比canvas2D就是麻烦很多啊。光是两种基本图形就多了这么多行代码，抓起根本多的原因就是因为**我们需要顶点信息**。简单如矩形我们可以直接写出它的顶点，但是复杂一点的圆，我们还得用数学方式去生成，明显阻碍了人类文明的进步。
相比较数学方式生成，如果我们能直接获得顶点信息那应该是最好的，有没有快捷的方式获取顶点信息呢？
有，使用建模软件生成obj文件。

Obj文件简单来说就是包含一个3D模型信息的文件，这里信息包含：顶点、纹理、法线以及该3D模型中纹理所使用的贴图
下面这个是一个obj文件的地址：
[]()

## 简单分析一下这个obj文件
图图图图图图图图图图图图
前两行看到#符号就知道这个是注释了，该obj文件是用blender导出的。Blender是一款很好用的建模软件，最主要的它是免费的！

图图图图图图图图图图图图
Mtllib(material library)指的是该obj文件所使用的材质库文件(.mtl)
单纯的obj生成的模型是白模的，它只含有纹理坐标的信息，但没有贴图，有纹理坐标也没用

图图图图图图图图图图图图
V 顶点vertex
Vt 贴图坐标点
Vn 顶点法线

图图图图图图图图图图图图
Usemtl 使用材质库文件中具体哪一个材质

图图图图图图图图图图图图
F是面，后面分别对应 顶点索引 / 纹理坐标索引 / 法线索引

这里大部分也都是我们非常常用的属性了，还有一些其他的，这里就不多说，可以google搜一下，很多介绍很详细的文章。
如果有了obj文件，那我们的工作也就是将obj文件导入，然后读取内容并且按行解析就可以了。
先放出最后的结果，一个模拟银河系的3D文字效果。

在这里顺便说一下，2D文字是可以通过分析获得3D文字模型数据的，将文字写到canvas上之后读取像素，获取路径。我们这里没有采用该方法，因为虽然这样理论上任何2D文字都能转3D，还能做出类似input输入文字，3D展示的效果。但是本文是教大家快速搭建一个小世界，所以我们还是采用blender去建模。

## 具体实现

### 1、首先建模生成obj文件
这里我们使用blender生成文字
图图图图图图图图图图图图

### 2、读取分析obj文件
    var regex = { // 这里正则只去匹配了我们obj文件中用到数据
        vertex_pattern: /^v\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/, // 顶点
        normal_pattern: /^vn\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/, // 法线
        uv_pattern: /^vt\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/, // 纹理坐标
        face_vertex_uv_normal: /^f\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)(?:\s+(-?\d+)\/(-?\d+)\/(-?\d+))?/, // 面信息
        material_library_pattern: /^mtllib\s+([\d|\w|\.]+)/, // 依赖哪一个mtl文件
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
            if(/^#/.test(result[i]) || !result[i]) { // 注释部分过滤掉
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
                obj.position.push(+result[1], +result[2], +result[3]); // 加入到3D对象顶点数组
            } else if(secondChar === 'n' && (result = regex.normal_pattern.exec(str)) !== null) {
                obj.normalArr.push(+result[1], +result[2], +result[3]); // 加入到3D对象法线数组
            } else if(secondChar === 't' && (result = regex.uv_pattern.exec(str)) !== null) {
                obj.uvArr.push(+result[1], +result[2]); // 加入到3D对象纹理坐标数组
            }

        } else if(firstChar === 'f') {
            if((result = regex.face_vertex_uv_normal.exec(str)) !== null) {
                obj.addFace(result); // 将顶点、发现、纹理坐标数组变成面
            }
        } else if((result = regex.material_library_pattern.exec(str)) !== null) {
            obj.loadMtl(result[1]); // 加载mtl文件
        } else if((result = regex.material_use_pattern.exec(str)) !== null) {
            obj.loadImg(result[1]); // 加载图片
        }
    }

代码核心的地方都进行了注释，注意这里的正则只去匹配我们obj文件中含有的字段，其他信息没有去匹配，如果有对obj文件所有可能含有的信息完成匹配的同学可以去看下Threejs中objLoad部分源码

### 3、将obj中数据真正的运用3D对象中去
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
这里我们考虑到兼容obj文件中f(ace)行中4个值的情况，导出obj文件中可以强行选择只有三角面，不过我们在代码中兼容一下比较稳妥

### 4、旋转平移等变换
物体全部导入进去，剩下来的任务就是进行变换了，首先我们分析一下有哪些动画效果
因为我们模拟的是一个宇宙，3D文字就像是星球一样，有公转和自转；还有就是我们导入的obj文件都是基于(0,0,0)点的，所以我们**还需要把它们进行平移操作**
先上核心代码~
    ......
    this.angle += this.rotate; // 自转的角度

    var s = Math.sin(this.angle);
    var c = Math.cos(this.angle);
    
    // 公转相关数据
    var gs = Math.sin(globalTime * this.revolution); // globalTime是全局的时间
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
                    this.x,this.y,this.z,1 // x,y,z是偏移的位置
                ],[
                    c,0,-s,0,
                    0,1,0,0,
                    s,0,c,0,
                    0,0,0,1
                ]
            )
        )
    );

一眼望去uMMatrix(模型矩阵)里面有三个矩阵，为什么有三个呢，它们的顺序有什么要求么？
因为矩阵不满足交换率，所以我们矩阵的平移和旋转的顺序十分重要，先平移再旋转和先旋转再平移有如下的差异
图图图图图图图图图图图图
从图中明显看出来**先旋转后平移是自转**，而**先平移后旋转是公转**
所以我们矩阵的顺序一定是 公转 * 平移 * 自转 * 顶点信息(右乘)
这样一个3D文字的8大行星就形成啦

### 4、装饰星星
光秃秃的几个文字肯定不够，所以我们还需要一点点缀，就用几个点当作星星，非常简单
注意**默认渲染webgl.POINTS是方形的**，所以我们得在fragment shader中加工处理一下
    precision highp float;

    void main() {
        float dist = distance(gl_PointCoord, vec2(0.5, 0.5)); // 计算距离
        if(dist < 0.5) {
            gl_FragColor = vec4(0.9, 0.9, 0.8, pow((1.0 - dist * 2.0), 3.0));
        } else {
            discard; // 丢弃
        }
    }

## 结语
需要关注的是这里我用了另外一对shader，此时就涉及到了关于是用多个program shader还是在同一个shader中使用if statements，这两者性能如何，有什么区别
这里将放在下一篇webgl相关优化中去说

本文就到这里啦，有问题和建议的小伙伴欢迎留言一起讨论~