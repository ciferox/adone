// Copyright 2011 Mark Cavage <mcavage@gmail.com> All rights reserved.
class InvalidAsn1Error extends Error
{
    constructor(msg = ""){
        super();
        this.name = "InvalidAsn1Error";
        this.message = msg;
    }
}

export {
    InvalidAsn1Error
};
