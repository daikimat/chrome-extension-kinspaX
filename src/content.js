(() => {
    'use strict';

    class ThredList {
        constructor() {
            this.changeWidtdhEventListners = []
            this.getElements();
            if (this.contentLeft !== null && this.contentBody !== null) {
                this.ready = true;
                let that = this;
                chrome.storage.local.get(['thredListWidth'], (result) => {
                    if (result.thredListWidth !== undefined) {
                        that.changeWidth(result.thredListWidth);
                    }
                });
                return;
            }    
            this.ready = false;
        }
        getElements() {
            this.contentLeft = document.querySelector(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-left");
            this.threadListItemLink = document.querySelectorAll(".gaia-argoui-space-threadlist-item-link");
            this.contentBody = document.querySelector(".gaia-argoui-space-spacecontent.three-pane .gaia-argoui-space-spacecontent-body");
        }
        changeWidth(width) {
            // super heavy
            if (this.ready === false) {
                return;
            }
            let widthWithPx = width + "px";
            this.contentLeft.style.width = widthWithPx;
            this.threadListItemLink.forEach(element => {
                element.style.width = widthWithPx;
            });
            this.contentBody.style.marginLeft = widthWithPx;
            chrome.storage.local.set({thredListWidth: width});
            this.changeWidtdhEventListners.forEach(listener => {
                listener();
            });
        }
        addChangeWidthEventListener(listner) {
            this.changeWidtdhEventListners.push(listner)
        }
    }

    class DraggableBar {
        constructor(threadlist) {
            this.setup(threadlist);
            threadlist.addChangeWidthEventListener(() => {
                this.syncXPosition();
            })
        }
        setup(threadlist) {
            this.threadlist = threadlist;
            this.setupThreadlist();
            this.draggableBar = document.querySelector("#kinspax-draggable-bar");
            if (this.draggableBar === null) {
                this.draggableBar = document.createElement("div");
                this.draggableBar.id = "kinspax-draggable-bar";
                this.layout();
                this.setupMouseEvent();
                this.insertBar();
            } else {
                this.layout();
                this.setupMouseEvent();
            }
        }
        setupThreadlist() {
            this.threadlist.contentLeft.ondragstart = () => {
                return false;
            };
            this.threadlist.contentBody.ondragstart = () => {
                return false;
            };
        }
        setupMouseEvent() {
            let that = this;
            let onMouseMove = (event) => {
                if (event.pageX > 0) {
                    that.draggableBar.style.left = event.pageX + "px";
                }
            }
            let onMouseUp = (event) => {
                if (event.pageX > 0) {
                    that.threadlist.changeWidth(event.pageX);
                    that.draggableBar.style.left = event.pageX + "px";
                }
            }
            that.draggableBar.ondragstart = () => {
                return false;
            };

            that.draggableBar.onmousedown = (_) => {
                document.addEventListener('mousemove', onMouseMove);
                that.draggableBar.onmouseup = (event) => {
                    onMouseUp(event)
                    document.removeEventListener('mousemove', onMouseMove);
                    that.draggableBar.onmouseup = null;
                };
            };
        }
        layout() {
            this.syncHeight();
            this.syncXPosition();
        }
        syncHeight() {
            const intervalId = setInterval(() => {
                let spacebody = document.querySelector(".gaia-argoui-space-spacelayout-body");
                let computedStyleHeight = parseInt(window.getComputedStyle(spacebody).getPropertyValue("height"), 10)
                if ( computedStyleHeight > 0 ) {
                    this.draggableBar.style.height = computedStyleHeight + "px";
                    clearInterval(intervalId);
                }
            }, 600);
        }
        syncXPosition() {
            this.draggableBar.style.left = this.threadlist.contentBody.offsetLeft + "px";
        }
        insertBar() {
            this.threadlist.contentLeft.insertAdjacentElement('afterend', this.draggableBar);
        }
    }

    var draggable;
    var setup = () => {
        const intervalId = setInterval(() => {
            let threadlist = new ThredList();
            if (threadlist.ready === true) {
                if (draggable !== undefined) {
                    draggable.setup(threadlist);
                } else {
                    draggable = new DraggableBar(threadlist);
                }
                clearInterval(intervalId);
            }
        }, 1000);
    }
    setup();
    window.onhashchange = () => {
        setup();
    }

})();