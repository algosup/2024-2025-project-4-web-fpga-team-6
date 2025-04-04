//Verilog generated by VPR 9.0.0-dev+v8.0.0-11943-g8cb20aa52-dirty from post-place-and-route implementation
module FF2_norst (
    input \D ,
    input \clk ,
    output \Q 
);

    //Wires
    wire \D_output_0_0 ;
    wire \clk_output_0_0 ;
    wire \latch_Q_output_0_0 ;
    wire \latch_$dff~1^Q~0_output_0_0 ;
    wire \latch_$dff~1^Q~0_input_0_0 ;
    wire \latch_$dff~1^Q~0_clock_0_0 ;
    wire \latch_Q_clock_0_0 ;
    wire \Q_input_0_0 ;
    wire \latch_Q_input_0_0 ;

    //IO assignments
    assign \Q  = \Q_input_0_0 ;
    assign \D_output_0_0  = \D ;
    assign \clk_output_0_0  = \clk ;

    //Interconnect
    fpga_interconnect \routing_segment_D_output_0_0_to_latch_$dff~1^Q~0_input_0_0  (
        .datain(\D_output_0_0 ),
        .dataout(\latch_$dff~1^Q~0_input_0_0 )
    );

    fpga_interconnect \routing_segment_clk_output_0_0_to_latch_$dff~1^Q~0_clock_0_0  (
        .datain(\clk_output_0_0 ),
        .dataout(\latch_$dff~1^Q~0_clock_0_0 )
    );

    fpga_interconnect \routing_segment_clk_output_0_0_to_latch_Q_clock_0_0  (
        .datain(\clk_output_0_0 ),
        .dataout(\latch_Q_clock_0_0 )
    );

    fpga_interconnect \routing_segment_latch_Q_output_0_0_to_Q_input_0_0  (
        .datain(\latch_Q_output_0_0 ),
        .dataout(\Q_input_0_0 )
    );

    fpga_interconnect \routing_segment_latch_$dff~1^Q~0_output_0_0_to_latch_Q_input_0_0  (
        .datain(\latch_$dff~1^Q~0_output_0_0 ),
        .dataout(\latch_Q_input_0_0 )
    );


    //Cell instances
    DFF #(
        .INITIAL_VALUE(1'b0)
    ) \latch_$dff~1^Q~0  (
        .D(\latch_$dff~1^Q~0_input_0_0 ), 
        .Q(\latch_$dff~1^Q~0_output_0_0 ), 
        .clock(\latch_$dff~1^Q~0_clock_0_0 )
    );
    DFF #(
        .INITIAL_VALUE(1'b0)
    ) \latch_Q  (
        .D(\latch_Q_input_0_0 ), 
        .Q(\latch_Q_output_0_0 ), 
        .clock(\latch_Q_clock_0_0 )
    );

endmodule
