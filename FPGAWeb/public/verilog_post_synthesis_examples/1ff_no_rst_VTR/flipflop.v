module FF1_norst(D,clk,Q);
    input D;            // Data input
    input clk;          // clock input
    output reg Q;       // output Q

//simple flipflop example
    always @(posedge clk )
        begin
             Q <= D;
        end

endmodule



// Latch module not in the project
module latch(D,Q,En);
    input D;
    input En;
    output reg Q;

    always @(*)
    begin
        if (En)
        begin
            Q <= D;
        end
    end
endmodule