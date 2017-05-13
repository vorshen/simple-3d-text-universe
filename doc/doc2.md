上次文章介绍了如何用webgl快速创建一个自己的小世界，在我们入门webgl之后，并且可以用原生webgl写demo越来越复杂之后，大家可能会纠结一点：就是我使用webgl的姿势对不对。因为webgl可以操控shader加上超底层API，带来了一个现象就是同样一个东西，可以有多种的实现方式，而此时我们该如何选择呢？这篇文章将稍微深入一点webgl，给大家介绍一点webgl的优化知识。

讲webgl优化之前我们先简单回忆一下canvas2D的优化，常用的display list、动态区域重绘等等。用canvas2D多的同学应该对以上的优化或多或少都有了解，我们稍微剖析一下优化的原理，balabalabala。

这里涉及到了底层图像是如何渲染到屏幕上的，而我们也是从这里开始优化我们的webgl。

## gpu如何渲染出一个物体
先看一个简单的球的例子，下面是用webgl画出来的一个球，加上了一点光的效果，代码很简单，这里就不展开说了。
地址地址地址地址地址地址
这个球是一个简单的3D模型，也没有复杂的一些变化，所以例子中的球性能很好，看FPS值稳定在60。后面我们会尝试让它变得复杂起来，然后进行一些优化，不过这一节我们得先了解渲染的原理，知其根本才能知道优化的原理。
我们都知道webgl与着色器是密不可分的关系，webgl当中有顶点着色器和片段着色器，下面用一张图来简单说明下一个物体由0到1生成的过程。
图图图图图图图图图图图图
0就是起点，对应图上面的3D mesh，在程序中这个就是3D顶点信息
1就是终点，对应图上面的Image Output，此时已经渲染到屏幕上了
我们重点是关注中间那三个阶段，第一个是一个标准的三角形，甚至三角形上面用三个圈指明了三个点，再加上vertex关键字，可以很明白的知道是顶点着色器处理的阶段，图翻译为大白话就是：
我们将顶点信息传给顶点着色器(drawElements/drawArray)，然后着色器将顶点信息[整理]并开始画出三角形(gl_Position)
然后再看后两个图，很明显的fragments关键字指明了这是片元着色器阶段。Rasterization是光栅化，从图上直观的看就是三角形用三条线表示变成了用像素表示，其实实际上也是如此，更详细的可以看下面地址，这里不进行展开。
[如何理解光栅化-知乎](https://www.zhihu.com/question/29163054)
后面阶段是上色，可以用textture或者color都可以，反正统一以rgba的形式赋给gl_FragColor
图中vertexShader会执行3次，而fragmentShader会执行35次(有35个方块)
发现fragmentShader执行次数远远超过vertexShader，此时机智的朋友们肯定就想到尽可能的将fragmentShader中的计算放在vertexShader中，但是能这样玩么？
强行去找还是能找到这样的场景的，比如说反射光。反射光的计算其实不是很复杂，但也稍微有一定的计算量，看核心代码
    vec3 L = normalize(uLightDirection);
    vec3 N = normalize(vNormal);
    float lambertTerm = dot(N, -L);
    vIs = vec4(0.0, 0.0, 0.0, 1.0);
    if(lambertTerm > 0.0) {
        vec3 E = normalize(vEye);
        vec3 R = reflect(L, N);

        float specular = pow(max(dot(R, E), 0.0), uShininess);
        vIs = uLightSpecular * uMaterialSpecular * specular;
    }
上面反射光代码就不细说了，核心就是内置的reflect方法。这段代码既可以放在fragmentShader中也可以放在vertexShader中，但是二者的结果有些不同，结果分别如下
地址地址地址地址地址地址
地址地址地址地址地址地址
所以说这里的优化是有缺陷的，可以看到vertexShader中执行光计算和fragmentShader中执行生成的结果区别还是蛮大的。换言之如果想要实现图2的效果，必须在fragmentShader中去计算。开头就说了这篇文章的主题在**同样的一个效果，用什么方式是最优的**，所以continue~

## gpu计算能力很猛
上一节说了gpu渲染的原理，这里再随便说几个gpu相关的新闻
[百度人工智能大规模采用gpu](http://www.leiphone.com/news/201609/cD4r03UnXsdVW3so.html)，[PhysX碰撞检测使用gpu提速](https://en.wikipedia.org/wiki/PhysX)……种种类似的现象都表明了gpu在单纯的计算能力上是超过普通的cpu，而我们关注一下前一节shader里面的代码
vertexShader
    void main() {
        vec4 vertex = uMMatrix * uRMatrix * vec4(aPosition, 1.0);
        vNormal = vec3(uNMMatrix * uNRMatrix * vec4(aNormal, 1.0));
        vEye = -vec3((uVMatrix * vertex).xyz);

        gl_Position = uPMatrix * uVMatrix * vertex;
    }
fragmentShader
    void main() {
        vec3 L = normalize(uLightDirection);
        vec3 N = normalize(vNormal);
        float lambertTerm = dot(N, -L);

        vec4 Ia = uLightAmbient * uMaterialAmbient;
        vec4 Id = vec4(0.0, 0.0, 0.0, 1.0);
        vec4 Is = vec4(0.0, 0.0, 0.0, 1.0);

        if(lambertTerm > 0.0) {
            Id = uLightDiffuse * uMaterialDiffuse * lambertTerm;

            vec3 E = normalize(vEye);
            vec3 R = reflect(L, N);
            float specular = pow(max(dot(R, E), 0.0), uShininess);
            Is = uLightSpecular * uMaterialSpecular * specular;
        }

        vec4 finalColor = Ia + Id + Is;
        finalColor.a = 1.0;

        gl_FragColor = finalColor;
    }
可以发现逻辑语句很少，更多的都是计算，特别是矩阵的运算，两个mat4相乘通过js需要写成这样(代码来自glMatrix)
    mat4.multiply = function(mat, mat2, dest) {
        if(!dest) { dest = mat }
        
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
        var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
        var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
        var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
        
        var b00 = mat2[0], b01 = mat2[1], b02 = mat2[2], b03 = mat2[3];
        var b10 = mat2[4], b11 = mat2[5], b12 = mat2[6], b13 = mat2[7];
        var b20 = mat2[8], b21 = mat2[9], b22 = mat2[10], b23 = mat2[11];
        var b30 = mat2[12], b31 = mat2[13], b32 = mat2[14], b33 = mat2[15];
        
        dest[0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
        dest[1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
        dest[2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
        dest[3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
        dest[4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
        dest[5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
        dest[6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
        dest[7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
        dest[8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
        dest[9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
        dest[10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
        dest[11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
        dest[12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
        dest[13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
        dest[14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
        dest[15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;
        
        return dest;
    };
可以说相比普通的加减乘除来说矩阵相关的计算量还是有点大的，而gpu对矩阵的计算有过专门的优化，是非常快的

所以我们第一反应肯定就是能在shader中干的活就不要让js折腾啦，比如说前面代码中将proMatrix/viewMatrix/modelMatrix都放在shader中去计算。甚至将modelMatrix里面再区分成moveMatrix和rotateMatrix可以更好的去维护不是么~

但是了解threejs或者看其他学习资料的的同学肯定知道threejs会把这些计算放在js中去执行，这是为啥呢？？比如下方代码(节选自webgl编程指南)
vertexShader中
    ……
    attribute vec4 u_MvpMatrix;
    ……
    void main() {
        gl_Position = u_MvpMatrix * a_Position;
    }
    ……
javascript中
    ……
    var mvpMatrix = new Matrix4();
    mvpMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
    mvpMatrix.lookAt(3, 3, 7, 0, 0, 0, 0, 1, 0);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
    ……
这里居然把proMatrix/viewMatrix/modelMatrix全部在js中计算好，然后传入到shader中去，为什么要这样呢？

结合第一节我们看下vertexShader执行的次数是和顶点有关系的，而每个顶点都需要做对象坐标->世界坐标->眼睛坐标的变换，如果传入三个顶点，就代表gpu需要将proMatrix * viewMatrix * modelMatrix计算三次，而如果我们在js中就计算好，当作一个矩阵传给gpu，则是极好的。js中虽然计算起来相较gpu慢，但是胜在次数少啊。
看下面两个结果
地址地址地址地址地址
地址地址地址地址地址
第一个是将矩阵都传入给gpu去计算的，可以看到FPS维持在
第二个是将部分矩阵计算在js中完成的，可以看到FPS维持在
这里用的180个球，如果球的数量更大，区别还可以更加明显。所以说gpu计算虽好，但不要滥用呦~

## js与shader交互的成本
动画就是画一个静态场景然后擦掉接着画一个新的，重复不断。第一节中我们用的是setInterval去执行的，每一个tick中我们必须的操作就是更新shader中的attribute或者uniform，这些操作是很耗时的，因为是js和glsl程序去沟通，此时我们想一想，有没有什么可以优化的地方呢？
比如有一个场景，同样是一个球，这个球的材质颜色比较特殊
图图图图图图图图图
x,y方向上都有着渐变，不再是第一节上面一个色的了，此时我们该怎么办？
首先分析一下这个这个球
图图图图图图图图图
每一个红框区域的颜色是不同的，如果按之前的逻辑扩展，就意味着我们得有多个uniform去标识
我们先尝试一下，用如下的代码
代码代码代码代码代码
地址地址地址地址地址
发现FPS在40左右，还是蛮卡的。然后我们考虑一下，卡顿在哪？
vertexShader和fragmentShader执行的次数可以说都是一样的，但是uniform4fv和drawElements每一次tick中执行了多次，就代表着js与shader耗费了较大的时间。那我们应该如何优化呢？
核心在避免多次改变uniform，比方说我们可以尝试用attribute去代替uniform
看下结果怎样
地址地址地址地址地址
瞬间FPS就上去了对不~所以说灵活变通很重要，不能一味的死板，尽可能的减少js与shader的交互对性能的提高是大大有帮助的~

## 切换program的成本
上一节我们发现**频繁**切换切换uniform的开销比较大，有没有更大的呢？
当然有，那就是切换program，我们把之前的例子用切换program的方式试下，直接看下面的例子
**点击前慎重，可能会引起浏览器崩溃****
地址地址地址地址地址
已经不需要关心FPS的了，可以直观的感觉到奇卡无比。切换program的成本应该是在webgl中开销是非常大的了，所以一定要少切换program
这里说的是少切换program，而不是说不要切换program，从理论上来说可以单个program写完整个程序的呀，那什么时候又需要切换program呢？
program的作用是代替if else语句，相当于把if else抽出来单独一个program，所以就是如果一个shader里面的if else多到开销超过program的开销，此时我们就能选择用program啦。
当然这里的度有点难把握，需要开发者自己多尝试，结合实际情况进行选择。这里有一个关于选择program还是if else的讨论，感兴趣的同学可以看看
(https://forums.khronos.org/showthread.php/7144-Performance-More-Shaderprograms-VS-IF-Statements-in-Shader)